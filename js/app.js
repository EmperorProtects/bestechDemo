/**
 * Сборка демо-стенда: вкладки, 3D-модель, списки, графики, журнал аварий и пульт.
 * Данные даёт симулятор из sim.js — сеть и сервер здесь не участвуют.
 */

import { GLYPH, LEVEL_LABEL, SCENARIOS, STATE_LABEL, createSim, formatValue, hhmmss, limitText, num, ruDateTime } from './sim.js';
import { barChart, lineChart, sparkline } from './charts.js';

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const colorOf = (state) => `var(--bst-${state === 'ok' ? 'ok' : state === 'warning' ? 'warn' : state === 'alarm' ? 'alarm' : 'offline'})`;

/** Русская форма числительного: 1 авария, 2 аварии, 5 аварий. */
function plural(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
const stamp = (state, label) =>
  `<span class="bst-stamp" style="color:${colorOf(state)}"><span aria-hidden="true">${GLYPH[state]}</span>${esc(label ?? STATE_LABEL[state])}</span>`;

const sim = createSim({ tickMs: 2000, backfillMin: 60 });

const ui = {
  tab: 'overview',
  selectedId: null,
  selectedAlarm: null,
  period: 5,
  autoRotate: false,
  viewer: null,
  dragging: null,
};

/* ── Вкладки ──────────────────────────────────────────────────────────────── */

const tabs = [...document.querySelectorAll('.tabs__tab')];
tabs.forEach((btn) =>
  btn.addEventListener('click', () => {
    ui.tab = btn.dataset.tab;
    tabs.forEach((b) => (b.dataset.tab === ui.tab ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')));
    for (const section of document.querySelectorAll('main .page')) section.hidden = section.id !== `tab-${ui.tab}`;
    render(sim.sensors());
  }),
);

/* ── Инструменты в шапке ──────────────────────────────────────────────────── */

$('#pauseBtn').addEventListener('click', () => {
  if (sim.running) sim.stop();
  else sim.start();
  syncLive();
});

$('#themeBtn').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'paper' ? 'cyanotype' : 'paper';
  document.documentElement.dataset.theme = next;
  $('#themeBtn').textContent = next === 'paper' ? 'ЦИАНОТИПИЯ' : 'БУМАГА';
});

$('#resetBtn').addEventListener('click', () => {
  ui.selectedAlarm = null;
  sim.reset();
  renderAll();
});

function syncLive() {
  const badge = $('#liveBadge');
  badge.dataset.paused = String(!sim.running);
  $('#liveText').textContent = sim.running ? 'ЖИВОЙ РЕЖИМ' : 'ПАУЗА';
  $('#pauseBtn').textContent = sim.running ? 'ПАУЗА' : 'ПРОДОЛЖИТЬ';
}

/* ── 3D-модель ────────────────────────────────────────────────────────────── */

async function mountViewer() {
  const mount = $('#viewer');
  try {
    const { createViewer } = await import('./model3d.js');
    ui.viewer = createViewer(mount, (id) => selectSensor(id, true));
    ui.viewer.setSensors(sim.sensors(), ui.selectedId);
  } catch (error) {
    mount.innerHTML = `<div class="viewer-fallback">
      3D-модель не запустилась: браузер не дал WebGL.<br />Данные, графики и журнал аварий работают как обычно.
    </div>`;
    $('#viewButtons').hidden = true;
    console.warn('3D недоступен:', error);
  }
}

$('#viewButtons').addEventListener('click', (e) => {
  const view = e.target.closest('[data-view]')?.dataset.view;
  if (view) ui.viewer?.setView(view);
  if (e.target.closest('#rotateBtn')) {
    ui.autoRotate = !ui.autoRotate;
    ui.viewer?.setAutoRotate(ui.autoRotate);
    const btn = $('#rotateBtn');
    btn.setAttribute('aria-pressed', String(ui.autoRotate));
    btn.classList.toggle('bst-btn--primary', ui.autoRotate);
  }
});

function selectSensor(id, fly = false) {
  ui.selectedId = id;
  if (fly) ui.viewer?.focus(id);
  render(sim.sensors());
}

/* ── Обзор ────────────────────────────────────────────────────────────────── */

function renderKpi(counts) {
  const tiles = [
    { label: 'Датчики на связи', value: counts.online, unit: `/${counts.total}`, foot: counts.offline ? `${counts.offline} без связи` : 'все приборы отвечают' },
    { label: 'В допуске', value: counts.ok, unit: `/${counts.total}`, color: 'var(--bst-ok)', foot: 'значения в проектных границах' },
    { label: 'У границы допуска', value: counts.warning, color: 'var(--bst-warn)', foot: 'нужен контроль прораба' },
    {
      label: 'Вне допуска',
      value: counts.alarm,
      color: 'var(--bst-alarm)',
      foot: `${counts.openAlarms} ${plural(counts.openAlarms, 'авария открыта', 'аварии открыты', 'аварий открыто')}`,
    },
  ];
  $('#kpi').innerHTML = tiles
    .map(
      (t) => `<div class="kpi">
        <div class="bst-kpi__label">${esc(t.label)}</div>
        <div class="kpi__value" ${t.color ? `style="color:${t.color}"` : ''}>${t.value}${t.unit ? `<small>${esc(t.unit)}</small>` : ''}</div>
        <div class="kpi__foot">${esc(t.foot)}</div>
      </div>`,
    )
    .join('');
}

function renderLegend(counts) {
  $('#legend').innerHTML = `<span>УСЛОВНЫЕ ОБОЗНАЧЕНИЯ</span>
    <span style="color:var(--bst-ok)">${GLYPH.ok} в допуске (${counts.ok})</span>
    <span style="color:var(--bst-alarm)">${GLYPH.alarm} вне допуска (${counts.alarm})</span>
    <span style="color:var(--bst-warn)">${GLYPH.warning} у границы (${counts.warning})</span>
    <span style="color:var(--bst-offline)">${GLYPH.offline} нет связи (${counts.offline})</span>`;
}

function renderSensorList(sensors) {
  $('#sensorList').innerHTML = sensors
    .map(
      (s) => `<button type="button" class="sensor-row" data-id="${s.id}" data-selected="${s.id === ui.selectedId}">
        <span class="bst-mono" style="font-size:11px;color:${colorOf(s.state)}" aria-hidden="true">${GLYPH[s.state]}</span>
        <span class="bst-mono" style="font-size:11px">${esc(s.code)}</span>
        <span class="sensor-row__name">${esc(s.name)}</span>
        <span class="bst-mono" style="font-size:12px;color:${colorOf(s.state)}">${esc(s.value)}</span>
      </button>`,
    )
    .join('');
}

$('#sensorList').addEventListener('click', (e) => {
  const id = e.target.closest('.sensor-row')?.dataset.id;
  if (id) selectSensor(id, true);
});

function renderSelected(sensors) {
  const s = sensors.find((x) => x.id === ui.selectedId) ?? sensors[0];
  if (!s) return;
  ui.selectedId = s.id;
  const points = sim.series(s.code, 15 * 60_000);
  $('#selected').innerHTML = `
    <i class="bst-corner bst-corner--tl"></i><i class="bst-corner bst-corner--tr"></i>
    <i class="bst-corner bst-corner--bl"></i><i class="bst-corner bst-corner--br"></i>
    <div>
      <div class="selected__title">
        <span class="bst-mono" style="font-size:11px;border:1px solid var(--bst-line);padding:2px 7px">${esc(s.code)}</span>
        <span class="selected__name">${esc(s.name)}</span>
        ${stamp(s.state)}
        ${s.manual ? '<span class="bst-badge">РУЧНОЙ ВВОД</span>' : ''}
      </div>
      <div class="bst-mono" style="font-size:12px;color:var(--bst-text-mute)">${esc(s.axis)}</div>
      <div class="facts">
        <span><b>ТЕКУЩЕЕ</b>${esc(s.value)}</span>
        <span><b>ДОПУСК</b>${esc(s.limit)}</span>
        <span><b>РАЗДЕЛ</b>${esc(s.discipline)}</span>
        <span><b>ПОСЛЕДНИЙ ПАКЕТ</b>${hhmmss(new Date(s.lastTs))}</span>
      </div>
    </div>
    <div>${sparkline({ points, color: colorOf(s.state), threshold: s.limitValue ?? undefined, decimals: s.decimals })}</div>`;
}

/* ── Телеметрия ───────────────────────────────────────────────────────────── */

$('#periods').addEventListener('click', (e) => {
  const p = e.target.closest('[data-period]')?.dataset.period;
  if (!p) return;
  ui.period = Number(p);
  for (const b of document.querySelectorAll('#periods .bst-seg__opt')) b.setAttribute('aria-pressed', String(Number(b.dataset.period) === ui.period));
  renderCharts(sim.sensors());
});

const chartCard = (title, note, body) => `<div class="chart-card">
  <i class="bst-corner bst-corner--tl"></i><i class="bst-corner bst-corner--tr"></i>
  <div class="panel-head bst-mono"><span class="bst-eyebrow">◭ ${esc(title)}</span><span class="muted">${esc(note)}</span></div>
  <div class="chart-card__body">${body}</div>
</div>`;

function renderCharts(sensors) {
  const win = ui.period * 60_000;
  const by = (code) => sensors.find((s) => s.code === code);
  const series = (code, color, dashed = false) => ({ code, label: code, points: sim.series(code, win), color, dashed });

  const concrete = chartCard(
    'Температура твердеющего бетона',
    `окно ${ui.period} мин · КЖ-1, КЖ-3`,
    lineChart({
      series: [series('КЖ-1', 'var(--bst-accent)'), series('КЖ-3', 'var(--bst-accent-400)', true)],
      decimals: 1,
      unit: '°C',
      thresholds: [
        { value: 35, label: 'АВАРИЯ 35 °C' },
        { value: 5, label: 'АВАРИЯ 5 °C' },
      ],
    }),
  );

  const trusses = chartCard(
    'Нагрузка на фермы покрытия',
    'мгновенные значения · допуск 80 %',
    barChart({
      bars: ['Ф-1', 'Ф-2', 'Ф-3'].map((code) => {
        const s = by(code);
        return { label: code, value: Math.round(s?.raw ?? 0), state: s?.state ?? 'ok' };
      }),
      max: 100,
      threshold: { value: 80, label: 'АВАРИЯ 80 %' },
      unit: '%',
    }),
  );

  const settle = chartCard(
    'Осадки деформационных марок',
    `окно ${ui.period} мин · допуск 15 мм`,
    lineChart({
      series: [series('ГМ-01', 'var(--bst-accent-400)'), series('ГМ-03', 'var(--bst-accent)'), series('ГМ-07', 'var(--bst-warn)')],
      decimals: 1,
      unit: 'мм',
      thresholds: [{ value: 15, label: 'АВАРИЯ 15 мм' }],
    }),
  );

  const strength = chartCard(
    'Набор прочности бетона ПР-3',
    'метод зрелости · % от R28',
    lineChart({
      series: [series('ПР-3', 'var(--bst-ok)')],
      decimals: 0,
      unit: '% R28',
      thresholds: [{ value: 70, label: 'РАСПАЛУБКА 70 %', color: 'var(--bst-accent-ink)' }],
    }),
  );

  const crack = chartCard(
    'Раскрытие трещины ТР-1',
    `окно ${ui.period} мин · допуск 0,30 мм`,
    lineChart({
      series: [series('ТР-1', 'var(--bst-accent)')],
      decimals: 2,
      unit: 'мм',
      thresholds: [{ value: 0.3, label: 'АВАРИЯ 0,30 мм' }],
    }),
  );

  const utilities = chartCard(
    'Инженерные сети',
    `окно ${ui.period} мин · давление ВК-У2 и загрузка ТП-1`,
    lineChart({ series: [series('ВК-У2', 'var(--bst-accent)')], decimals: 2, unit: 'МПа', thresholds: [{ value: 0.6, label: 'АВАРИЯ 0,60 МПа' }] }) +
      lineChart({ series: [series('ЭОМ-ТП', 'var(--bst-warn)')], decimals: 0, unit: '%', height: 200, thresholds: [{ value: 95, label: 'АВАРИЯ 95 %' }] }),
  );

  $('#charts').innerHTML = concrete + trusses + settle + strength + crack + utilities;
}

/* ── Аварии ───────────────────────────────────────────────────────────────── */

function renderAlarms() {
  const list = sim.alarms;
  $('#tabAlarms').textContent = String(list.filter((a) => a.state !== 'closed').length);

  if (!list.length) {
    $('#alarms').innerHTML = `<div class="bst-empty">
      <h3 class="bst-h" style="font-size:20px">Отклонений нет</h3>
      <p style="max-width:46ch;margin:6px auto 0;color:var(--bst-text-soft)">
        Все датчики в допуске. Чтобы увидеть аварию, включите сценарий на вкладке «Пульт показаний».
      </p></div>`;
    return;
  }

  const selected = list.find((a) => a.id === ui.selectedAlarm) ?? list[0];
  ui.selectedAlarm = selected.id;

  const rows = list
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
    .join('');

  const points = sim.series(selected.code, 15 * 60_000);
  const sensor = sim.sensors().find((s) => s.code === selected.code);

  $('#alarms').innerHTML = `
    <div class="alarms__table-wrap">
      <table class="bst-table bst-table--sticky">
        <thead><tr><th>Датчик</th><th>Уровень</th><th>Значение</th><th>Порог</th><th>Открыта</th><th>Состояние</th></tr></thead>
        <tbody id="alarmRows">${rows}</tbody>
      </table>
    </div>
    <div class="alarms__detail">
      <div class="panel-head bst-mono"><span class="bst-eyebrow">◭ ${esc(selected.code)} · ДИНАМИКА</span><span class="muted">15 мин</span></div>
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
    </div>`;
}

$('#alarms').addEventListener('click', (e) => {
  const row = e.target.closest('tr[data-id]');
  if (row) {
    ui.selectedAlarm = row.dataset.id;
    renderAlarms();
    return;
  }
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act) {
    sim.act(ui.selectedAlarm, act);
    renderAlarms();
  }
});

/* ── Пульт показаний ──────────────────────────────────────────────────────── */

function renderScenarios() {
  $('#scenarios').innerHTML = SCENARIOS.map(
    (s) => `<button type="button" class="scenario" data-scenario="${s.id}" aria-pressed="${s.id === sim.scenario}">
      <b>${esc(s.label)}</b><span>${esc(s.note)}</span>
    </button>`,
  ).join('');
  const now = SCENARIOS.find((s) => s.id === sim.scenario);
  $('#scenarioNow').textContent = now ? `сейчас: ${now.label.toLowerCase()}` : '';
}

$('#scenarios').addEventListener('click', (e) => {
  const id = e.target.closest('[data-scenario]')?.dataset.scenario;
  if (!id) return;
  sim.applyScenario(id);
  renderScenarios();
});

const RANGES = {
  temperature: [-5, 45],
  strength: [0, 100],
  settlement: [0, 20],
  load: [0, 100],
  crack: [0, 0.5],
  pressure: [0.2, 0.7],
  power: [0, 100],
};

function renderSliders(sensors) {
  $('#sliders').innerHTML = sensors
    .map((s) => {
      const [min, max] = RANGES[s.kind] ?? [0, 100];
      const step = s.decimals === 0 ? 1 : s.decimals === 1 ? 0.1 : 0.01;
      return `<label class="slider" data-code="${esc(s.code)}">
        <span>${esc(s.code)}</span>
        <input type="range" id="rng-${esc(s.code)}" min="${min}" max="${max}" step="${step}" value="${s.raw}" aria-label="${esc(s.name)}" />
        <span class="slider__value" style="color:${colorOf(s.state)}">${esc(s.value)}</span>
      </label>`;
    })
    .join('');
}

$('#sliders').addEventListener('input', (e) => {
  const wrap = e.target.closest('.slider');
  if (!wrap) return;
  ui.dragging = wrap.dataset.code;
  sim.setValue(wrap.dataset.code, Number(e.target.value));
});
$('#sliders').addEventListener('change', () => {
  ui.dragging = null;
});

/** Значения ползунков подтягиваются к показаниям, кроме того, который сейчас тянут. */
function syncSliders(sensors) {
  for (const s of sensors) {
    const wrap = $(`#sliders .slider[data-code="${CSS.escape(s.code)}"]`);
    if (!wrap) continue;
    const range = wrap.querySelector('input');
    const out = wrap.querySelector('.slider__value');
    if (ui.dragging !== s.code && document.activeElement !== range) range.value = String(s.raw);
    out.textContent = s.value;
    out.style.color = colorOf(s.state);
  }
}

function renderPackets() {
  $('#packets').innerHTML = sim.packets
    .slice(0, 40)
    .map(
      (p) => `<li><span class="muted">${hhmmss(new Date(p.ts))}</span><span>${esc(p.device)}</span><b>принято ${p.accepted}</b>${
        p.silent ? `<span style="color:var(--bst-offline)">молчит ${p.silent}</span>` : ''
      }</li>`,
    )
    .join('');
}

/* ── Подвал и часы ────────────────────────────────────────────────────────── */

function renderFooter(counts) {
  $('#footer').innerHTML = `
    <div><b>ОБЪЕКТ</b>2026-014 · Молочный комплекс, 36 × 18 м</div>
    <div><b>ДАТЧИКИ</b>${counts.total} шт · опрос 5 с</div>
    <div><b>ИСТОЧНИК ДАННЫХ</b>симулятор в браузере</div>
    <div><b>НА ОБЪЕКТЕ</b>шлюз → POST /api/ingest/v1/readings</div>
    <div><b>СТЕНД</b>BESTECH · ТОО «Бек Строй Инвест»</div>`;
}

/* ── Общая отрисовка ──────────────────────────────────────────────────────── */

function render(sensors) {
  const counts = sim.counts();
  $('#clock').textContent = hhmmss(new Date());
  $('#tabAlarms').textContent = String(counts.openAlarms);
  ui.viewer?.setSensors(sensors, ui.selectedId);

  if (ui.tab === 'overview') {
    renderKpi(counts);
    renderLegend(counts);
    renderSensorList(sensors);
    renderSelected(sensors);
    $('#updated').textContent = `обновлено ${hhmmss(new Date())}`;
  }
  if (ui.tab === 'telemetry') renderCharts(sensors);
  if (ui.tab === 'alarms') renderAlarms();
  if (ui.tab === 'console') {
    if (!$('#sliders').childElementCount) renderSliders(sensors);
    else syncSliders(sensors);
    renderScenarios();
    renderPackets();
  }
  renderFooter(counts);
}

function renderAll() {
  const sensors = sim.sensors();
  if (!ui.selectedId) {
    const worst = sensors.find((s) => s.state === 'alarm') ?? sensors.find((s) => s.state === 'warning') ?? sensors[0];
    ui.selectedId = worst?.id ?? null;
  }
  renderSliders(sensors);
  renderScenarios();
  render(sensors);
}

sim.onTick((sensors) => render(sensors));
renderAll();
syncLive();
mountViewer();
sim.start();

// Пауза в скрытой вкладке: браузер и так тормозит таймеры, а лишние такты симуляции не нужны.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) sim.stop();
  else if (!sim.running) sim.start();
  syncLive();
});
