/**
 * Каркас демо: маршрутизация по адресу, сайдбар и шапка кабинета, экраны
 * документации и двойник с симуляцией. Сервера нет — всё живёт в браузере.
 */

import { ASSETS, ORG, STAGE_LABELS, USERS, assetByCode } from './data.js';
import { assetScreen, assetsScreen, documentsScreen, inputsScreen, loginScreen, sheetScreen } from './screens.js';
import { GLYPH, LEVEL_LABEL, SCENARIOS, STATE_LABEL, createSim, hhmmss, num, ruDateTime } from './sim.js';
import { barChart, lineChart, sparkline } from './charts.js';

const root = document.getElementById('root');
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const colorOf = (state) => `var(--bst-${state === 'ok' ? 'ok' : state === 'warning' ? 'warn' : state === 'alarm' ? 'alarm' : 'offline'})`;
const stamp = (state, label) =>
  `<span class="bst-stamp" style="color:${colorOf(state)}"><span aria-hidden="true">${GLYPH[state]}</span>${esc(label ?? STATE_LABEL[state])}</span>`;

function plural(n, one, few, many) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

const state = {
  user: null,
  route: { screen: 'login' },
  /** Последний открытый объект: по нему строится навигация, даже когда открыт общий список. */
  currentCode: ASSETS[0].code,
  stageFilter: 'all',
  selectedId: null,
  selectedAlarm: null,
  period: 5,
  autoRotate: false,
  dragging: null,
};

/* ── Симулятор двойника: один на страницу, живёт между экранами ───────────── */

const sim = createSim({ tickMs: 2000, backfillMin: 60 });
let viewer = null;
const viewerMount = document.createElement('div');
viewerMount.className = 'viewer';
viewerMount.id = 'viewer';

async function ensureViewer() {
  if (viewer) return;
  try {
    const { createViewer } = await import('./model3d.js');
    viewer = createViewer(viewerMount, (id) => {
      state.selectedId = id;
      viewer?.focus(id);
      renderTwinBody();
    });
    viewer.setSensors(sim.sensors(), state.selectedId);
  } catch (error) {
    viewerMount.innerHTML = `<div class="viewer-fallback">3D-модель не запустилась: браузер не дал WebGL.<br />Данные, графики и журнал аварий работают как обычно.</div>`;
    console.warn('3D недоступен:', error);
  }
}

/* ── Маршрут ──────────────────────────────────────────────────────────────── */

function parseHash() {
  const raw = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  const parts = raw.split('/').filter(Boolean);
  if (!parts.length) return { screen: state.user ? 'assets' : 'login' };
  if (parts[0] === 'login') return { screen: 'login' };
  if (parts[0] === 'assets') return { screen: 'assets' };
  if (parts[0] === 'asset') {
    const code = parts[1];
    if (parts[2] === 'inputs') return { screen: 'inputs', code };
    if (parts[2] === 'documents') return { screen: parts[3] && parts[3].includes('-') ? 'sheet' : 'documents', code, param: parts[3] };
    return { screen: 'asset', code };
  }
  if (parts[0] === 'twin') return { screen: 'twin', code: parts[1], sub: parts[2] ?? 'overview' };
  return { screen: 'notfound' };
}

function navigate(hash) {
  location.hash = hash;
}

window.addEventListener('hashchange', () => {
  state.route = parseHash();
  render();
});

/* ── Оболочка ─────────────────────────────────────────────────────────────── */

const NAV_CABINET = (code) => [
  { href: '#/assets', label: 'Мои объекты', key: 'assets' },
  ...(code
    ? [
        { href: `#/asset/${code}`, label: 'Лист объекта', key: 'asset' },
        { href: `#/asset/${code}/inputs`, label: 'Исходные данные', key: 'inputs' },
        { href: `#/asset/${code}/documents`, label: 'Документация', key: 'documents' },
        ...(assetByCode(code)?.hasTwin ? [{ href: `#/twin/${code}`, label: 'Цифровой двойник', key: 'twin' }] : []),
      ]
    : []),
];

const NAV_TWIN = (code) => [
  { href: `#/twin/${code}`, label: 'Обзор', key: 'overview' },
  { href: `#/twin/${code}/telemetry`, label: 'Телеметрия', key: 'telemetry' },
  { href: `#/twin/${code}/alarms`, label: 'Аварии', key: 'alarms' },
  { href: `#/twin/${code}/console`, label: 'Пульт показаний', key: 'console' },
  { href: `#/asset/${code}`, label: '← В кабинет', key: 'back' },
];

function shell({ section, code, navKey, headerCells, footerCells, body }) {
  const navCode = code ?? state.currentCode;
  const asset = code ? assetByCode(code) : null;
  const items = section === 'twin' ? NAV_TWIN(navCode) : NAV_CABINET(navCode);
  const user = state.user;

  return `<div class="app">
    <aside class="app__aside">
      <div class="side__brand">
        <a href="#/assets">BESTECH</a>
        <span class="bst-mono">${section === 'twin' ? 'ЦИФРОВОЙ ДВОЙНИК' : 'КАБИНЕТ ЗАКАЗЧИКА'}</span>
      </div>

      <div class="side__switcher">
        <div class="bst-kpi__label">Объект</div>
        <select class="bst-input" id="assetSwitch" aria-label="Выбор объекта">
          ${ASSETS.map((a) => `<option value="${esc(a.code)}" ${a.code === navCode ? 'selected' : ''}>${esc(a.code)} · ${esc(a.shortName)}</option>`).join('')}
        </select>
        ${asset ? `<div class="bst-mono muted" style="font-size:10.5px;margin-top:6px">${esc(STAGE_LABELS[asset.stage])} · ${esc(asset.region)}</div>` : ''}
      </div>

      <nav class="side__nav">
        ${items
          .map((i) => `<a class="nav-link" href="${i.href}" ${i.key === navKey ? 'aria-current="page"' : ''}>${esc(i.label)}</a>`)
          .join('')}
      </nav>

      <div class="side__foot">
        <div class="bst-kpi__label">Вид</div>
        <div class="bst-seg" role="group" aria-label="Тема" id="themeSeg">
          <!-- Атрибут именно data-set-theme: data-theme селектором из tokens.css перекрасил бы саму кнопку. -->
          <button type="button" class="bst-seg__opt" data-set-theme="paper" aria-pressed="${document.documentElement.dataset.theme === 'paper'}">БУМАГА</button>
          <button type="button" class="bst-seg__opt" data-set-theme="cyanotype" aria-pressed="${document.documentElement.dataset.theme === 'cyanotype'}">ЦИАНОТИПИЯ</button>
        </div>
        <div class="side__user">
          <span class="side__avatar bst-mono">${esc(user.initials)}</span>
          <span style="min-width:0">
            <span class="side__name">${esc(user.name)}</span>
            <span class="bst-mono muted side__role">${esc(user.roleLabel)}</span>
          </span>
          <button type="button" class="bst-btn bst-btn--ghost bst-btn--sm" id="logout" title="Выйти">Выйти</button>
        </div>
      </div>
    </aside>

    <div class="app__main">
      <header class="app__header">
        <div class="sheet-strip bst-mono">
          ${headerCells.map((c) => `<div><span>${esc(c.k)}</span><b>${c.v}</b></div>`).join('')}
        </div>
      </header>
      <main id="view">${body}</main>
      <footer class="app__footer bst-mono">
        ${footerCells.map((c) => `<div><b>${esc(c.k)}</b>${c.v}</div>`).join('')}
      </footer>
    </div>
  </div>`;
}

/* ── Кабинет ──────────────────────────────────────────────────────────────── */

function cabinetFooter(asset) {
  return [
    { k: 'ОРГАНИЗАЦИЯ', v: esc(ORG.name) },
    { k: 'ОБЪЕКТ', v: asset ? `${esc(asset.code)} · ${esc(asset.shortName)}` : `${ASSETS.length} объекта` },
    { k: 'ДАННЫЕ', v: 'демо-стенд, данные примерные' },
    { k: 'ПОДДЕРЖКА', v: 'ТОО «Бек Строй Инвест»' },
  ];
}

function renderCabinet() {
  const { screen, code, param } = state.route;
  const asset = code ? assetByCode(code) : null;
  const headerCells =
    screen === 'assets'
      ? [
          { k: 'ОРГАНИЗАЦИЯ', v: esc(ORG.name) },
          { k: 'ОБЪЕКТОВ', v: String(ASSETS.length) },
          { k: 'РОЛЬ', v: esc(state.user.roleLabel) },
        ]
      : [
          { k: 'ШИФР', v: esc(asset?.code ?? '—') },
          { k: 'ОБЪЕКТ', v: esc(asset?.shortName ?? '—') },
          { k: 'СТАДИЯ', v: esc(asset ? STAGE_LABELS[asset.stage] : '—') },
          { k: 'ОБНОВЛЕНО', v: esc(asset?.updated ?? '—') },
        ];

  const body =
    screen === 'assets'
      ? assetsScreen({ stage: state.stageFilter })
      : screen === 'asset'
        ? assetScreen(code)
        : screen === 'inputs'
          ? inputsScreen(code)
          : screen === 'documents'
            ? documentsScreen(code, param)
            : sheetScreen(code, param);

  root.innerHTML = shell({
    section: 'cabinet',
    code,
    navKey: screen === 'sheet' ? 'documents' : screen,
    headerCells,
    footerCells: cabinetFooter(asset),
    body,
  });

  wireShell();
  wireCabinet();
}

function wireCabinet() {
  document.getElementById('stageFilter')?.addEventListener('click', (e) => {
    const stage = e.target.closest('[data-stage]')?.dataset.stage;
    if (!stage) return;
    state.stageFilter = stage;
    renderCabinet();
  });

  document.getElementById('sectionRows')?.addEventListener('click', (e) => {
    const section = e.target.closest('tr[data-section]')?.dataset.section;
    if (section) navigate(`#/asset/${state.route.code}/documents/${encodeURIComponent(section)}`);
  });

  for (const btn of document.querySelectorAll('[data-demo-note]')) {
    btn.addEventListener('click', () => toast(`${btn.dataset.demoNote}: в демо файлы не выдаются. В портале лист собирается по ГОСТ 2.104 и скачивается PDF или ZIP.`));
  }

  const dropzone = document.getElementById('dropzone');
  if (dropzone) {
    const stop = (e) => {
      e.preventDefault();
      dropzone.dataset.over = e.type === 'dragover' ? 'true' : 'false';
    };
    dropzone.addEventListener('dragover', stop);
    dropzone.addEventListener('dragleave', stop);
    dropzone.addEventListener('drop', (e) => {
      stop(e);
      toast(`Файлов выбрано: ${e.dataTransfer?.files?.length ?? 0}. В демо загрузка не выполняется.`);
    });
    document.getElementById('pickFile')?.addEventListener('click', () => toast('В демо загрузка не выполняется: в портале файл ложится в хранилище и пересчитывает комплектность.'));
  }

  // Клик по маркеру замечания на листе — подсветить карточку замечания.
  for (const g of document.querySelectorAll('.sheet-remark')) {
    g.addEventListener('click', () => {
      const card = document.getElementById(`remark-${g.dataset.remark}`);
      if (!card) return;
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('remark--flash');
      setTimeout(() => card.classList.remove('remark--flash'), 1200);
    });
  }
}

/* ── Двойник ──────────────────────────────────────────────────────────────── */

function twinFooter() {
  const c = sim.counts();
  return [
    { k: 'ОБЪЕКТ', v: '2026-014 · Молочный комплекс, 36 × 18 м' },
    { k: 'ДАТЧИКИ', v: `${c.total} шт · опрос 5 с` },
    { k: 'ИСТОЧНИК ДАННЫХ', v: 'симулятор в браузере' },
    { k: 'НА ОБЪЕКТЕ', v: 'шлюз → POST /api/ingest/v1/readings' },
  ];
}

function renderTwin() {
  const { code, sub } = state.route;
  const asset = assetByCode(code);
  root.innerHTML = shell({
    section: 'twin',
    code,
    navKey: sub,
    headerCells: [
      { k: 'ШИФР', v: esc(code) },
      { k: 'ОБЪЕКТ', v: esc(asset?.shortName ?? '—') },
      { k: 'РЕЖИМ', v: `<span class="live" id="liveBadge"><i class="live-dot"></i><span id="liveText">ЖИВОЙ РЕЖИМ</span></span>` },
      { k: 'ВРЕМЯ', v: `<span id="clock">${hhmmss(new Date())}</span>` },
    ],
    footerCells: twinFooter(),
    body: `<div class="page" id="twinBody"></div>`,
  });

  wireShell();

  const head = document.querySelector('.app__header');
  head.insertAdjacentHTML(
    'beforeend',
    `<div class="head-tools">
      <button type="button" class="bst-btn bst-btn--sm" id="pauseBtn">ПАУЗА</button>
      <button type="button" class="bst-btn bst-btn--sm" id="resetBtn">СБРОС ДЕМО</button>
    </div>`,
  );
  document.getElementById('pauseBtn').addEventListener('click', () => {
    if (sim.running) sim.stop();
    else sim.start();
    syncLive();
  });
  document.getElementById('resetBtn').addEventListener('click', () => {
    state.selectedAlarm = null;
    sim.reset();
    renderTwinBody();
    toast('Демо-данные сброшены: журнал очищен, история набрана заново.');
  });

  renderTwinBody();
  syncLive();
  if (sub === 'overview') void ensureViewer();
}

function twinOverview(sensors) {
  const c = sim.counts();
  const tiles = [
    { label: 'Датчики на связи', value: c.online, unit: `/${c.total}`, foot: c.offline ? `${c.offline} без связи` : 'все приборы отвечают' },
    { label: 'В допуске', value: c.ok, unit: `/${c.total}`, color: 'var(--bst-ok)', foot: 'значения в проектных границах' },
    { label: 'У границы допуска', value: c.warning, color: 'var(--bst-warn)', foot: 'нужен контроль прораба' },
    { label: 'Вне допуска', value: c.alarm, color: 'var(--bst-alarm)', foot: `${c.openAlarms} ${plural(c.openAlarms, 'авария открыта', 'аварии открыты', 'аварий открыто')}` },
  ];

  const selected = sensors.find((s) => s.id === state.selectedId) ?? sensors[0];
  state.selectedId = selected?.id ?? null;
  const points = sim.series(selected.code, 15 * 60_000);

  return `<div class="kpi-row">
      ${tiles
        .map(
          (t) => `<div class="kpi"><div class="bst-kpi__label">${esc(t.label)}</div>
            <div class="kpi__value" ${t.color ? `style="color:${t.color}"` : ''}>${t.value}${t.unit ? `<small>${esc(t.unit)}</small>` : ''}</div>
            <div class="kpi__foot">${esc(t.foot)}</div></div>`,
        )
        .join('')}
    </div>

    <div class="overview">
      <div class="bst-frame viewer-frame">
        <i class="bst-corner bst-corner--tl"></i><i class="bst-corner bst-corner--tr"></i>
        <i class="bst-corner bst-corner--bl"></i><i class="bst-corner bst-corner--br"></i>
        <div class="panel-head bst-mono">
          <span class="bst-eyebrow">◭ МОДЕЛЬ ОБЪЕКТА · КАРКАС</span>
          <span class="panel-head__views" id="viewButtons">
            <button type="button" class="bst-btn bst-btn--sm" data-view="iso">ИЗОМЕТРИЯ</button>
            <button type="button" class="bst-btn bst-btn--sm" data-view="top">СВЕРХУ</button>
            <button type="button" class="bst-btn bst-btn--sm" data-view="side">ФАСАД</button>
            <button type="button" class="bst-btn bst-btn--sm${state.autoRotate ? ' bst-btn--primary' : ''}" id="rotateBtn" aria-pressed="${state.autoRotate}">ВРАЩЕНИЕ</button>
          </span>
        </div>
        <div id="viewerSlot"></div>
        <div class="legend bst-mono">
          <span>УСЛОВНЫЕ ОБОЗНАЧЕНИЯ</span>
          <span style="color:var(--bst-ok)">${GLYPH.ok} в допуске (${c.ok})</span>
          <span style="color:var(--bst-alarm)">${GLYPH.alarm} вне допуска (${c.alarm})</span>
          <span style="color:var(--bst-warn)">${GLYPH.warning} у границы (${c.warning})</span>
          <span style="color:var(--bst-offline)">${GLYPH.offline} нет связи (${c.offline})</span>
        </div>
      </div>

      <aside class="bst-frame sensors-frame">
        <i class="bst-corner bst-corner--tl"></i><i class="bst-corner bst-corner--tr"></i>
        <i class="bst-corner bst-corner--bl"></i><i class="bst-corner bst-corner--br"></i>
        <div class="panel-head bst-mono"><span class="bst-eyebrow">◭ ПОСЛЕДНИЕ ИЗМЕРЕНИЯ</span><span class="muted" style="margin-left:auto">${hhmmss(new Date())}</span></div>
        <div class="sensor-list" id="sensorList">
          ${sensors
            .map(
              (s) => `<button type="button" class="sensor-row" data-id="${s.id}" data-selected="${s.id === state.selectedId}">
                <span class="bst-mono" style="font-size:11px;color:${colorOf(s.state)}" aria-hidden="true">${GLYPH[s.state]}</span>
                <span class="bst-mono" style="font-size:11px">${esc(s.code)}</span>
                <span class="sensor-row__name">${esc(s.name)}</span>
                <span class="bst-mono" style="font-size:12px;color:${colorOf(s.state)}">${esc(s.value)}</span>
              </button>`,
            )
            .join('')}
        </div>
      </aside>
    </div>

    <div class="bst-frame selected-frame">
      <i class="bst-corner bst-corner--tl"></i><i class="bst-corner bst-corner--tr"></i>
      <i class="bst-corner bst-corner--bl"></i><i class="bst-corner bst-corner--br"></i>
      <div>
        <div class="selected__title">
          <span class="bst-mono" style="font-size:11px;border:1px solid var(--bst-line);padding:2px 7px">${esc(selected.code)}</span>
          <span class="selected__name">${esc(selected.name)}</span>
          ${stamp(selected.state)}
          ${selected.manual ? '<span class="bst-badge">РУЧНОЙ ВВОД</span>' : ''}
        </div>
        <div class="bst-mono muted" style="font-size:12px">${esc(selected.axis)}</div>
        <div class="facts">
          <span><b>ТЕКУЩЕЕ</b>${esc(selected.value)}</span>
          <span><b>ДОПУСК</b>${esc(selected.limit)}</span>
          <span><b>РАЗДЕЛ</b>${esc(selected.discipline)}</span>
          <span><b>ПОСЛЕДНИЙ ПАКЕТ</b>${hhmmss(new Date(selected.lastTs))}</span>
        </div>
      </div>
      <div>${sparkline({ points, color: colorOf(selected.state), threshold: selected.limitValue ?? undefined, decimals: selected.decimals })}</div>
    </div>`;
}

function twinTelemetry(sensors) {
  const win = state.period * 60_000;
  const by = (code) => sensors.find((s) => s.code === code);
  const series = (code, color, dashed = false) => ({ code, label: code, points: sim.series(code, win), color, dashed });
  const card = (title, note, body) => `<div class="chart-card">
    <i class="bst-corner bst-corner--tl"></i><i class="bst-corner bst-corner--tr"></i>
    <div class="panel-head bst-mono"><span class="bst-eyebrow">◭ ${esc(title)}</span><span class="muted" style="margin-left:auto">${esc(note)}</span></div>
    <div class="chart-card__body">${body}</div></div>`;

  return `<div class="panel-head bst-mono" style="border:1px solid var(--bst-line);background:var(--bst-surface)">
      <span class="bst-eyebrow">◭ ТЕЛЕМЕТРИЯ ОБЪЕКТА</span>
      <span class="bst-seg" id="periods" role="group" aria-label="Окно графиков" style="margin-left:auto">
        ${[5, 15, 60].map((p) => `<button type="button" class="bst-seg__opt" data-period="${p}" aria-pressed="${p === state.period}">${p === 60 ? '1 Ч' : `${p} МИН`}</button>`).join('')}
      </span>
    </div>
    <div class="charts">
      ${card('Температура твердеющего бетона', `окно ${state.period} мин · КЖ-1, КЖ-3`, lineChart({ series: [series('КЖ-1', 'var(--bst-accent)'), series('КЖ-3', 'var(--bst-accent-400)', true)], decimals: 1, unit: '°C', thresholds: [{ value: 35, label: 'АВАРИЯ 35 °C' }, { value: 5, label: 'АВАРИЯ 5 °C' }] }))}
      ${card('Нагрузка на фермы покрытия', 'мгновенные значения · допуск 80 %', barChart({ bars: ['Ф-1', 'Ф-2', 'Ф-3'].map((code) => { const s = by(code); return { label: code, value: Math.round(s?.raw ?? 0), state: s?.state ?? 'ok' }; }), max: 100, threshold: { value: 80, label: 'АВАРИЯ 80 %' }, unit: '%' }))}
      ${card('Осадки деформационных марок', `окно ${state.period} мин · допуск 15 мм`, lineChart({ series: [series('ГМ-01', 'var(--bst-accent-400)'), series('ГМ-03', 'var(--bst-accent)'), series('ГМ-07', 'var(--bst-warn)')], decimals: 1, unit: 'мм', thresholds: [{ value: 15, label: 'АВАРИЯ 15 мм' }] }))}
      ${card('Набор прочности бетона ПР-3', 'метод зрелости · % от R28', lineChart({ series: [series('ПР-3', 'var(--bst-ok)')], decimals: 0, unit: '% R28', thresholds: [{ value: 70, label: 'РАСПАЛУБКА 70 %', color: 'var(--bst-accent-ink)' }] }))}
      ${card('Раскрытие трещины ТР-1', `окно ${state.period} мин · допуск 0,30 мм`, lineChart({ series: [series('ТР-1', 'var(--bst-accent)')], decimals: 2, unit: 'мм', thresholds: [{ value: 0.3, label: 'АВАРИЯ 0,30 мм' }] }))}
      ${card('Инженерные сети', 'давление ВК-У2 и загрузка ТП-1', lineChart({ series: [series('ВК-У2', 'var(--bst-accent)')], decimals: 2, unit: 'МПа', thresholds: [{ value: 0.6, label: 'АВАРИЯ 0,60 МПа' }] }) + lineChart({ series: [series('ЭОМ-ТП', 'var(--bst-warn)')], decimals: 0, unit: '%', height: 200, thresholds: [{ value: 95, label: 'АВАРИЯ 95 %' }] }))}
    </div>`;
}

function twinAlarms(sensors) {
  const list = sim.alarms;
  if (!list.length) {
    return `<div class="bst-empty">
      <h3 class="bst-h" style="font-size:20px">Отклонений нет</h3>
      <p class="muted" style="max-width:46ch;margin:6px auto 0">Все датчики в допуске. Чтобы увидеть аварию, включите сценарий на вкладке «Пульт показаний».</p>
    </div>`;
  }
  const selected = list.find((a) => a.id === state.selectedAlarm) ?? list[0];
  state.selectedAlarm = selected.id;
  const sensor = sensors.find((s) => s.code === selected.code);
  const points = sim.series(selected.code, 15 * 60_000);

  return `<div class="panel-head bst-mono" style="border:1px solid var(--bst-line);background:var(--bst-surface)">
      <span class="bst-eyebrow">◭ ЖУРНАЛ ОТКЛОНЕНИЙ</span>
      <span class="muted" style="margin-left:auto">квитирование фиксирует, что отклонение увидели</span>
    </div>
    <div class="alarms">
      <div class="alarms__table-wrap">
        <table class="bst-table bst-table--sticky">
          <thead><tr><th>Датчик</th><th>Уровень</th><th>Значение</th><th>Порог</th><th>Открыта</th><th>Состояние</th></tr></thead>
          <tbody id="alarmRows">
            ${list
              .map(
                (a) => `<tr data-id="${a.id}" data-selected="${a.id === selected.id ? 'true' : ''}" style="cursor:pointer">
                  <td class="bst-mono" style="font-size:12px">${esc(a.code)}</td>
                  <td>${stamp(a.level, LEVEL_LABEL[a.level])}</td>
                  <td class="bst-num">${a.level === 'offline' ? '—' : esc(num(a.value, 2).replace(/,00$/, ''))}</td>
                  <td class="bst-mono" style="font-size:11.5px">${esc(a.limit)}</td>
                  <td class="bst-mono" style="font-size:11.5px">${hhmmss(new Date(a.openedAt))}</td>
                  <td class="bst-mono" style="font-size:11.5px">${a.state === 'open' ? 'открыта' : a.state === 'ack' ? 'квитирована' : 'закрыта'}</td>
                </tr>`,
              )
              .join('')}
          </tbody>
        </table>
      </div>
      <div class="alarms__detail">
        <div class="panel-head bst-mono"><span class="bst-eyebrow">◭ ${esc(selected.code)} · ДИНАМИКА</span><span class="muted" style="margin-left:auto">15 мин</span></div>
        <div style="padding:12px 14px 0">${sparkline({ points, color: colorOf(selected.level), threshold: sensor?.limitValue ?? undefined, decimals: sensor?.decimals ?? 1 })}</div>
        <div class="facts" style="padding:0 14px">
          <span><b>ДАТЧИК</b>${esc(selected.name)}</span>
          <span><b>ПРИВЯЗКА</b>${esc(selected.axis)}</span>
          <span><b>ПРИЧИНА</b>${esc(selected.note)}</span>
          <span><b>ОБНОВЛЕНО</b>${ruDateTime(new Date(selected.updatedAt))}</span>
        </div>
        <div class="alarm-actions">
          <button type="button" class="bst-btn bst-btn--sm" data-act="ack" ${selected.state === 'open' ? '' : 'disabled'}>КВИТИРОВАТЬ</button>
          <button type="button" class="bst-btn bst-btn--sm bst-btn--primary" data-act="close" ${selected.state === 'closed' ? 'disabled' : ''}>ЗАКРЫТЬ</button>
        </div>
      </div>
    </div>`;
}

const RANGES = { temperature: [-5, 45], strength: [0, 100], settlement: [0, 20], load: [0, 100], crack: [0, 0.5], pressure: [0.2, 0.7], power: [0, 100] };

function twinConsole(sensors) {
  const now = SCENARIOS.find((s) => s.id === sim.scenario);
  return `<div class="bst-frame padded-frame">
      <i class="bst-corner bst-corner--tl"></i><i class="bst-corner bst-corner--tr"></i>
      <i class="bst-corner bst-corner--bl"></i><i class="bst-corner bst-corner--br"></i>
      <div class="panel-head bst-mono"><span class="bst-eyebrow">◭ СЦЕНАРИИ ПОКАЗА</span><span class="muted" style="margin-left:auto">${now ? `сейчас: ${esc(now.label.toLowerCase())}` : ''}</span></div>
      <div class="scenarios" id="scenarios">
        ${SCENARIOS.map((s) => `<button type="button" class="scenario" data-scenario="${s.id}" aria-pressed="${s.id === sim.scenario}"><b>${esc(s.label)}</b><span>${esc(s.note)}</span></button>`).join('')}
      </div>
    </div>

    <div class="console-grid">
      <div class="bst-frame padded-frame">
        <i class="bst-corner bst-corner--tl"></i><i class="bst-corner bst-corner--tr"></i>
        <i class="bst-corner bst-corner--bl"></i><i class="bst-corner bst-corner--br"></i>
        <div class="panel-head bst-mono"><span class="bst-eyebrow">◭ РУЧНОЙ ВВОД ПОКАЗАНИЙ</span></div>
        <div class="sliders" id="sliders">
          ${sensors
            .map((s) => {
              const [min, max] = RANGES[s.kind] ?? [0, 100];
              const step = s.decimals === 0 ? 1 : s.decimals === 1 ? 0.1 : 0.01;
              return `<label class="slider" data-code="${esc(s.code)}">
                <span>${esc(s.code)}</span>
                <input type="range" min="${min}" max="${max}" step="${step}" value="${s.raw}" aria-label="${esc(s.name)}" />
                <span class="slider__value" style="color:${colorOf(s.state)}">${esc(s.value)}</span>
              </label>`;
            })
            .join('')}
        </div>
      </div>

      <div class="bst-frame padded-frame">
        <i class="bst-corner bst-corner--tl"></i><i class="bst-corner bst-corner--tr"></i>
        <i class="bst-corner bst-corner--bl"></i><i class="bst-corner bst-corner--br"></i>
        <div class="panel-head bst-mono"><span class="bst-eyebrow">◭ ПАКЕТЫ ШЛЮЗА</span></div>
        <ul class="packets bst-mono" id="packets">
          ${sim.packets
            .slice(0, 40)
            .map((p) => `<li><span class="muted">${hhmmss(new Date(p.ts))}</span><span>${esc(p.device)}</span><b>принято ${p.accepted}</b>${p.silent ? `<span style="color:var(--bst-offline)">молчит ${p.silent}</span>` : ''}</li>`)
            .join('')}
        </ul>
      </div>
    </div>`;
}

function renderTwinBody() {
  const body = document.getElementById('twinBody');
  if (!body) return;
  const sensors = sim.sensors();
  const sub = state.route.sub ?? 'overview';

  if (!state.selectedId) {
    const worst = sensors.find((s) => s.state === 'alarm') ?? sensors.find((s) => s.state === 'warning') ?? sensors[0];
    state.selectedId = worst?.id ?? null;
  }

  const draggingCode = state.dragging;
  body.innerHTML = sub === 'telemetry' ? twinTelemetry(sensors) : sub === 'alarms' ? twinAlarms(sensors) : sub === 'console' ? twinConsole(sensors) : twinOverview(sensors);

  if (sub === 'overview') {
    document.getElementById('viewerSlot')?.append(viewerMount);
    viewer?.setSensors(sensors, state.selectedId);
    document.getElementById('sensorList')?.addEventListener('click', (e) => {
      const id = e.target.closest('.sensor-row')?.dataset.id;
      if (!id) return;
      state.selectedId = id;
      viewer?.focus(id);
      renderTwinBody();
    });
    document.getElementById('viewButtons')?.addEventListener('click', (e) => {
      const view = e.target.closest('[data-view]')?.dataset.view;
      if (view) viewer?.setView(view);
      if (e.target.closest('#rotateBtn')) {
        state.autoRotate = !state.autoRotate;
        viewer?.setAutoRotate(state.autoRotate);
        renderTwinBody();
      }
    });
  }

  if (sub === 'telemetry') {
    document.getElementById('periods')?.addEventListener('click', (e) => {
      const p = e.target.closest('[data-period]')?.dataset.period;
      if (!p) return;
      state.period = Number(p);
      renderTwinBody();
    });
  }

  if (sub === 'alarms') {
    // Слушатели вешаем на свежую разметку: #twinBody переживает перерисовку и накопил бы их.
    document.getElementById('alarmRows')?.addEventListener('click', (e) => {
      const row = e.target.closest('tr[data-id]');
      if (!row) return;
      state.selectedAlarm = row.dataset.id;
      renderTwinBody();
    });
    body.querySelector('.alarm-actions')?.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (!act) return;
      sim.act(state.selectedAlarm, act);
      renderTwinBody();
    });
  }

  if (sub === 'console') {
    const sliders = document.getElementById('sliders');
    sliders?.addEventListener('input', (e) => {
      const wrap = e.target.closest('.slider');
      if (!wrap) return;
      state.dragging = wrap.dataset.code;
      sim.setValue(wrap.dataset.code, Number(e.target.value));
    });
    sliders?.addEventListener('change', () => {
      state.dragging = null;
    });
    document.getElementById('scenarios')?.addEventListener('click', (e) => {
      const id = e.target.closest('[data-scenario]')?.dataset.scenario;
      if (!id) return;
      sim.applyScenario(id);
      renderTwinBody();
    });
    if (draggingCode) {
      const input = sliders?.querySelector(`.slider[data-code="${CSS.escape(draggingCode)}"] input`);
      input?.focus();
      state.dragging = draggingCode;
    }
  }
}

function syncLive() {
  const badge = document.getElementById('liveBadge');
  if (!badge) return;
  badge.dataset.paused = String(!sim.running);
  document.getElementById('liveText').textContent = sim.running ? 'ЖИВОЙ РЕЖИМ' : 'ПАУЗА';
  const btn = document.getElementById('pauseBtn');
  if (btn) btn.textContent = sim.running ? 'ПАУЗА' : 'ПРОДОЛЖИТЬ';
}

/* ── Общее ────────────────────────────────────────────────────────────────── */

function wireShell() {
  document.getElementById('assetSwitch')?.addEventListener('change', (e) => {
    const code = e.target.value;
    const twin = state.route.screen === 'twin' && assetByCode(code)?.hasTwin;
    navigate(twin ? `#/twin/${code}` : `#/asset/${code}`);
  });

  document.getElementById('themeSeg')?.addEventListener('click', (e) => {
    const theme = e.target.closest('[data-set-theme]')?.dataset.setTheme;
    if (!theme) return;
    document.documentElement.dataset.theme = theme;
    for (const b of document.querySelectorAll('#themeSeg .bst-seg__opt')) b.setAttribute('aria-pressed', String(b.dataset.setTheme === theme));
  });

  document.getElementById('logout')?.addEventListener('click', () => {
    state.user = null;
    navigate('#/login');
    render();
  });
}

let toastTimer = 0;
function toast(text) {
  const el = document.getElementById('toast');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.hidden = true;
  }, 4200);
}

function render() {
  const route = state.route;
  if (route.code && assetByCode(route.code)) state.currentCode = route.code;

  if (!state.user || route.screen === 'login') {
    document.documentElement.dataset.theme = 'paper';
    root.innerHTML = loginScreen();
    for (const btn of document.querySelectorAll('[data-user]')) {
      btn.addEventListener('click', () => {
        state.user = USERS.find((u) => u.id === btn.dataset.user) ?? USERS[1];
        navigate('#/assets');
        state.route = parseHash();
        render();
      });
    }
    return;
  }

  if (route.screen === 'twin') {
    document.documentElement.dataset.theme = 'cyanotype';
    renderTwin();
    return;
  }

  document.documentElement.dataset.theme = 'paper';
  renderCabinet();
}

sim.onTick(() => {
  if (state.route.screen !== 'twin') return;
  const clock = document.getElementById('clock');
  if (clock) clock.textContent = hhmmss(new Date());
  renderTwinBody();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) sim.stop();
  else if (!sim.running) sim.start();
  syncLive();
});

state.route = parseHash();
if (state.route.screen !== 'login' && !state.user) state.user = USERS[1]; // вход по прямой ссылке: ГИП
render();
sim.start();
