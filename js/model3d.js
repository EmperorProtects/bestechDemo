/**
 * 3D-модель корпуса на three.js: каркас линиями как на чертеже, датчики по привязке
 * к осям, цвет метки — состояние, пульсация при выходе за допуск, ферма с перегрузом
 * подсвечивается. Портировано с боевого стенда (components/twin/ModelViewer3D.tsx).
 */

import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from '../vendor/CSS2DRenderer.js';

export const BUILDING = { length: 36, span: 18, bay: 6, eave: 7.2, ridge: 10 };
const AXES_X = ['1', '2', '3', '4', '5', '6', '7'];
const AXES_Z = ['А', 'Б', 'В', 'Г'];
/** Какую ферму красить по состоянию датчика нагрузки: код датчика → ось X фермы. */
const TRUSS_OF_SENSOR = { 'Ф-1': 6, 'Ф-2': 24, 'Ф-3': 30 };

const roofHeightAt = (z) => {
  const half = BUILDING.span / 2;
  return BUILDING.eave + (BUILDING.ridge - BUILDING.eave) * (1 - Math.abs(z - half) / half);
};

/** Любой CSS-цвет токена (hex, rgb, color-mix) → THREE.Color через нормализацию canvas. */
function cssColor(variable, fallback) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(variable).trim() || fallback;
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return new THREE.Color(fallback);
  ctx.fillStyle = fallback;
  ctx.fillStyle = raw;
  const normalized = String(ctx.fillStyle).replace(/^rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)$/, 'rgb($1,$2,$3)');
  return new THREE.Color(normalized);
}

const readPalette = () => ({
  line: cssColor('--bst-accent', '#9cc7f2'),
  lineSoft: cssColor('--bst-accent-700', '#4a6a8f'),
  grid: cssColor('--bst-grid', '#2c3e55'),
  ok: cssColor('--bst-ok', '#7fc49a'),
  warning: cssColor('--bst-warn', '#e3b865'),
  alarm: cssColor('--bst-alarm', '#e8837a'),
  offline: cssColor('--bst-offline', '#b7b7ba'),
});

const stateColor = (p, state) => (state === 'alarm' ? p.alarm : state === 'warning' ? p.warning : state === 'offline' ? p.offline : p.ok);

function lineObject(segments, color, opacity = 1, dashed = false) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(segments.flat(), 3));
  const material = dashed
    ? new THREE.LineDashedMaterial({ color, dashSize: 0.9, gapSize: 0.5, transparent: opacity < 1, opacity })
    : new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity });
  const lines = new THREE.LineSegments(geometry, material);
  if (dashed) lines.computeLineDistances();
  return lines;
}

function trussSegments(x) {
  const { eave, span } = BUILDING;
  const out = [[x, eave, 0, x, eave, span]];
  const nodes = [0, 3, 6, 9, 12, 15, 18];
  for (let i = 0; i < nodes.length - 1; i += 1) {
    const z1 = nodes[i];
    const z2 = nodes[i + 1];
    out.push([x, roofHeightAt(z1), z1, x, roofHeightAt(z2), z2]); // верхний пояс
    out.push([x, eave, z2, x, roofHeightAt(z2), z2]); // стойка
    out.push([x, eave, z1, x, roofHeightAt(z2), z2]); // раскос
  }
  return out;
}

function buildStructure(p) {
  const group = new THREE.Group();
  const { length, span, bay, eave, ridge } = BUILDING;

  const axes = [];
  for (let i = 0; i <= length / bay; i += 1) axes.push([i * bay, 0, -3, i * bay, 0, span + 3]);
  for (let j = 0; j <= span / bay; j += 1) axes.push([-3, 0, j * bay, length + 3, 0, j * bay]);
  group.add(lineObject(axes, p.lineSoft, 0.8, true));

  const ground = new THREE.GridHelper(96, 48, p.grid, p.grid);
  ground.position.set(length / 2, -0.02, span / 2);
  ground.material.transparent = true;
  ground.material.opacity = 0.35;
  group.add(ground);

  const fill = new THREE.MeshBasicMaterial({ color: p.line, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false });
  const slab = new THREE.Mesh(new THREE.PlaneGeometry(length, span).rotateX(-Math.PI / 2).translate(length / 2, 0, span / 2), fill);
  group.add(slab);

  const roofGeo = new THREE.BufferGeometry();
  roofGeo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [0, eave, 0, length, eave, 0, length, ridge, span / 2, 0, eave, 0, length, ridge, span / 2, 0, ridge, span / 2,
        0, eave, span, 0, ridge, span / 2, length, ridge, span / 2, 0, eave, span, length, ridge, span / 2, length, eave, span],
      3,
    ),
  );
  group.add(new THREE.Mesh(roofGeo, fill));

  const frame = [
    [0, 0, 0, length, 0, 0], [0, 0, span, length, 0, span], [0, 0, 0, 0, 0, span], [length, 0, 0, length, 0, span],
    [0, eave, 0, length, eave, 0], [0, eave, span, length, eave, span],
    [0, ridge, span / 2, length, ridge, span / 2],
    [0, (eave + ridge) / 2, span / 4, length, (eave + ridge) / 2, span / 4],
    [0, (eave + ridge) / 2, (3 * span) / 4, length, (eave + ridge) / 2, (3 * span) / 4],
  ];
  for (let i = 0; i <= length / bay; i += 1) {
    const x = i * bay;
    frame.push([x, 0, 0, x, eave, 0], [x, 0, span, x, eave, span]);
    if (i < length / bay) {
      for (const z of [0, span]) {
        frame.push([x + 0.8, 3.4, z, x + bay - 0.8, 3.4, z], [x + 0.8, 4.8, z, x + bay - 0.8, 4.8, z]);
      }
    }
  }
  for (let j = 0; j <= span / bay; j += 1) {
    frame.push([0, 0, j * bay, 0, eave, j * bay], [length, 0, j * bay, length, eave, j * bay]);
  }
  for (const gx of [6, 18, 30]) {
    frame.push([gx - 1.6, 0, 0, gx - 1.6, 3.8, 0], [gx + 1.6, 0, 0, gx + 1.6, 3.8, 0], [gx - 1.6, 3.8, 0, gx + 1.6, 3.8, 0]);
  }
  group.add(lineObject(frame, p.line, 0.95));

  const named = new Map(Object.entries(TRUSS_OF_SENSOR).map(([code, x]) => [x, code]));
  const plain = [];
  const trusses = new Map();
  for (let i = 0; i <= length / bay; i += 1) {
    const x = i * bay;
    const code = named.get(x);
    if (code) {
      const obj = lineObject(trussSegments(x), p.line);
      trusses.set(code, obj.material);
      group.add(obj);
    } else {
      plain.push(...trussSegments(x));
    }
  }
  group.add(lineObject(plain, p.lineSoft, 0.9));

  const addAxisLabel = (text, x, z) => {
    const el = document.createElement('div');
    el.className = 'tw3d-axis';
    el.textContent = text;
    const obj = new CSS2DObject(el);
    obj.position.set(x, 0, z);
    group.add(obj);
  };
  AXES_X.forEach((a, i) => addAxisLabel(a, i * bay, -4.2));
  AXES_Z.forEach((a, j) => addAxisLabel(a, -4.2, j * bay));

  return {
    group,
    trusses,
    dispose() {
      group.traverse((o) => {
        o.geometry?.dispose?.();
        const mat = o.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose?.();
      });
      group.children.filter((c) => c instanceof CSS2DObject).forEach((c) => group.remove(c));
    },
  };
}

/** Незнакомый код выстраивается рядом с корпусом, чтобы не потеряться. */
const fallbackPosition = (index) => [2 + (index % 7) * 5, 0.8, BUILDING.span + 5 + Math.floor(index / 7) * 3];

/**
 * Создаёт вьюер в контейнере. Возвращает управление: обновить датчики, подлететь
 * к датчику, сменить вид, включить автовращение. Без WebGL бросает исключение —
 * вызывающая сторона показывает схему.
 */
export function createViewer(mount, onPick) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  Object.assign(renderer.domElement.style, { position: 'absolute', inset: '0', display: 'block', outline: 'none' });
  mount.appendChild(renderer.domElement);

  const labels = new CSS2DRenderer();
  Object.assign(labels.domElement.style, { position: 'absolute', inset: '0', pointerEvents: 'none' });
  mount.appendChild(labels.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 600);
  const center = new THREE.Vector3(BUILDING.length / 2, 3.5, BUILDING.span / 2);
  const views = {
    iso: new THREE.Vector3(-22, 30, -26),
    top: new THREE.Vector3(BUILDING.length / 2 + 0.01, 66, BUILDING.span / 2 + 0.01),
    side: new THREE.Vector3(BUILDING.length / 2, 9, -48),
  };
  camera.position.copy(views.iso);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(center);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 8;
  controls.maxDistance = 150;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.autoRotateSpeed = 0.7;

  let palette = readPalette();
  let structure = buildStructure(palette);
  scene.add(structure.group);

  const markers = new Map();
  let sensors = [];
  let selected = null;
  let camGoal = null;
  let targetGoal = null;
  controls.addEventListener('start', () => {
    camGoal = null;
    targetGoal = null;
  });

  const coreGeo = new THREE.SphereGeometry(0.42, 18, 12);
  const haloGeo = new THREE.SphereGeometry(0.95, 18, 12);

  function createMarker(sensor) {
    const [x, y, z] = sensor.pos ?? fallbackPosition(sensor.index ?? 0);
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const core = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: palette.ok, transparent: true }));
    const halo = new THREE.Mesh(haloGeo, new THREE.MeshBasicMaterial({ color: palette.ok, transparent: true, opacity: 0.16, depthWrite: false }));
    core.userData.sensorId = sensor.id;
    halo.userData.sensorId = sensor.id;
    group.add(core, halo);

    let stem = null;
    if (y > 1.5) {
      stem = lineObject([[0, 0, 0, 0, -y, 0]], palette.lineSoft, 0.6, true);
      group.add(stem);
    }

    const el = document.createElement('div');
    el.className = 'tw3d-label';
    const code = document.createElement('b');
    const value = document.createElement('span');
    el.append(code, value);
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      onPick(sensor.id);
    });
    const label = new CSS2DObject(el);
    label.position.set(0, 1.35, 0);
    group.add(label);

    scene.add(group);
    return { group, core, halo, stem, label, code, value, state: sensor.state };
  }

  function removeMarker(m) {
    scene.remove(m.group);
    m.group.remove(m.label);
    m.core.material.dispose();
    m.halo.material.dispose();
    if (m.stem) {
      m.stem.geometry.dispose();
      m.stem.material.dispose();
    }
  }

  function apply() {
    const ids = new Set(sensors.map((s) => s.id));
    for (const [id, m] of markers) {
      if (!ids.has(id)) {
        removeMarker(m);
        markers.delete(id);
      }
    }
    for (const s of sensors) {
      let m = markers.get(s.id);
      if (!m) {
        m = createMarker(s);
        markers.set(s.id, m);
      }
      const color = stateColor(palette, s.state);
      m.state = s.state;
      m.core.material.color.copy(color);
      m.core.material.opacity = s.state === 'offline' ? 0.45 : 1;
      m.halo.material.color.copy(color);
      m.code.textContent = s.code;
      m.value.textContent = s.value;
      m.label.element.dataset.state = s.state;
      m.label.element.dataset.selected = String(s.id === selected);
    }
    for (const [code, material] of structure.trusses) {
      const s = sensors.find((x) => x.code === code);
      material.color.copy(!s || s.state === 'ok' ? palette.line : stateColor(palette, s.state));
    }
  }

  const resize = () => {
    const w = mount.clientWidth || 640;
    const h = mount.clientHeight || 420;
    renderer.setSize(w, h);
    labels.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(mount);
  resize();

  // Смена темы «Бумага» / «Цианотипия»: перечитываем токены и перестраиваем каркас.
  const mo = new MutationObserver(() => {
    palette = readPalette();
    scene.remove(structure.group);
    structure.dispose();
    structure = buildStructure(palette);
    scene.add(structure.group);
    apply();
  });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let down = { x: 0, y: 0 };
  const onDown = (e) => {
    down = { x: e.clientX, y: e.clientY };
  };
  const onUp = (e) => {
    if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects([...markers.values()].flatMap((m) => [m.core, m.halo]), false)[0];
    const id = hit?.object.userData.sensorId;
    if (id) onPick(id);
  };
  renderer.domElement.addEventListener('pointerdown', onDown);
  renderer.domElement.addEventListener('pointerup', onUp);

  const started = performance.now();
  let raf = 0;
  const frame = () => {
    raf = requestAnimationFrame(frame);
    const t = (performance.now() - started) / 1000;

    if (camGoal) {
      camera.position.lerp(camGoal, 0.07);
      if (camera.position.distanceTo(camGoal) < 0.05) camGoal = null;
    }
    if (targetGoal) {
      controls.target.lerp(targetGoal, 0.07);
      if (controls.target.distanceTo(targetGoal) < 0.05) targetGoal = null;
    }

    for (const [id, m] of markers) {
      const isSelected = id === selected;
      const pulsing = m.state === 'alarm' || m.state === 'warning';
      const speed = m.state === 'alarm' ? 6 : 3;
      const wave = 0.5 + 0.5 * Math.sin(t * speed);
      m.halo.visible = pulsing || isSelected;
      m.halo.scale.setScalar((isSelected ? 1.3 : 1) + (pulsing ? 0.45 * wave : 0));
      m.halo.material.opacity = pulsing ? 0.1 + 0.22 * wave : 0.18;
    }

    controls.update();
    renderer.render(scene, camera);
    labels.render(scene, camera);
  };
  frame();

  return {
    setSensors(next, selectedId) {
      sensors = next;
      selected = selectedId;
      apply();
    },
    focus(id) {
      const m = markers.get(id);
      if (!m) return;
      const p = m.group.position.clone();
      const offset = camera.position.clone().sub(controls.target);
      offset.setLength(Math.min(38, Math.max(18, offset.length())));
      targetGoal = p;
      camGoal = p.clone().add(offset);
    },
    setView(view) {
      camGoal = views[view].clone();
      targetGoal = center.clone();
    },
    setAutoRotate(on) {
      controls.autoRotate = on;
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      controls.dispose();
      for (const m of markers.values()) removeMarker(m);
      markers.clear();
      scene.remove(structure.group);
      structure.dispose();
      coreGeo.dispose();
      haloGeo.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      labels.domElement.remove();
    },
  };
}
