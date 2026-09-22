/**
 * Симулятор стройплощадки для демо-стенда. Повторяет поведение боевого стенда BESTECH:
 * датчики дают показания с шумом и дрейфом, значения сверяются с порогами проекта,
 * выход за порог открывает аварию, тишина в эфире даёт «нет связи».
 *
 * Разница только в источнике данных: здесь их считает браузер, на объекте они приходят
 * от шлюза по HTTP (POST /api/ingest/v1/readings с ключом устройства).
 */

/** Датчики объекта 2026-014 «Молочный комплекс»: пороги — из проекта, координаты — по привязке к осям. */
export const SENSORS = [
  { code: 'КЖ-1', discipline: 'КЖ', name: 'Температура бетона, ось А/1', kind: 'temperature', unit: '°C', decimals: 1,
    axis: 'ось А/1 · монолит перекрытия +0.000', pos: [1.5, 0.35, 1.5], warnLow: 8, warnHigh: 32, alarmLow: 5, alarmHigh: 35, interval: 5, base: 21.4 },
  { code: 'КЖ-3', discipline: 'КЖ', name: 'Температура бетона, ось Б/4', kind: 'temperature', unit: '°C', decimals: 1,
    axis: 'ось Б/4 · монолит перекрытия +0.000', pos: [18, 0.35, 6], warnLow: 8, warnHigh: 32, alarmLow: 5, alarmHigh: 35, interval: 5, base: 19.2 },
  { code: 'ПР-3', discipline: 'КЖ', name: 'Набор прочности бетона, ось Б/4', kind: 'strength', unit: '% R28', decimals: 0,
    axis: 'ось Б/4 · датчик зрелости бетона', pos: [19.6, 0.35, 7.4], interval: 5, base: 42 },
  { code: 'ГМ-01', discipline: 'КЖ', name: 'Осадка деформационной марки', kind: 'settlement', unit: 'мм', decimals: 1,
    axis: 'ось А/1 · марка ГМ-01', pos: [-0.8, 0.35, -0.8], warnHigh: 12, alarmHigh: 15, interval: 5, base: 3.9 },
  { code: 'ГМ-03', discipline: 'КЖ', name: 'Осадка деформационной марки', kind: 'settlement', unit: 'мм', decimals: 1,
    axis: 'ось Б/6 · марка ГМ-03', pos: [30, 0.35, 6], warnHigh: 12, alarmHigh: 15, interval: 5, base: 7.2 },
  { code: 'ГМ-07', discipline: 'КЖ', name: 'Осадка деформационной марки', kind: 'settlement', unit: 'мм', decimals: 1,
    axis: 'ось В/2 · марка ГМ-07', pos: [6, 0.35, 12], warnHigh: 12, alarmHigh: 15, interval: 5, base: 11.1 },
  { code: 'Ф-1', discipline: 'КМ', name: 'Нагрузка на ферму покрытия', kind: 'load', unit: '%', decimals: 0,
    axis: 'оси 1–2 · ферма Ф-1', pos: [6, 7.2, 9], warnHigh: 75, alarmHigh: 80, interval: 5, base: 61 },
  { code: 'Ф-2', discipline: 'КМ', name: 'Нагрузка на ферму покрытия', kind: 'load', unit: '%', decimals: 0,
    axis: 'оси 4–5 · ферма Ф-2', pos: [24, 7.2, 9], warnHigh: 75, alarmHigh: 80, interval: 5, base: 68 },
  { code: 'Ф-3', discipline: 'КМ', name: 'Нагрузка на ферму покрытия', kind: 'load', unit: '%', decimals: 0,
    axis: 'оси 6–7 · ферма Ф-3', pos: [30, 7.2, 9], warnHigh: 75, alarmHigh: 80, interval: 5, base: 54 },
  { code: 'ТР-1', discipline: 'КЖ', name: 'Раскрытие трещины, стена по оси Г', kind: 'crack', unit: 'мм', decimals: 2,
    axis: 'ось Г/3 · трещиномер', pos: [16, 2.6, 18.25], warnHigh: 0.2, alarmHigh: 0.3, interval: 5, base: 0.12 },
  { code: 'ВК-У2', discipline: 'ВК', name: 'Давление в узле водоснабжения', kind: 'pressure', unit: 'МПа', decimals: 2,
    axis: 'узел У2 · ввод В1', pos: [21, 0.6, -3.5], warnLow: 0.33, warnHigh: 0.57, alarmLow: 0.3, alarmHigh: 0.6, interval: 5, base: 0.45 },
  { code: 'ЭОМ-ТП', discipline: 'ЭОМ', name: 'Загрузка трансформатора ТП-1', kind: 'power', unit: '%', decimals: 0,
    axis: 'ТП-1 · ось А/1', pos: [-5, 1.2, 3], warnHigh: 80, alarmHigh: 95, interval: 5, base: 58 },
];

/** Сценарии показа: то же, что кнопки эмулятора и пресеты пульта на боевом стенде. */
export const SCENARIOS = [
  { id: 'normal', label: 'Всё в норме', note: 'значения возвращаются к рабочим, связь восстанавливается' },
  { id: 'load', label: 'Перегруз фермы Ф-2', note: 'нагрузка растёт до 88 %: предупреждение, затем авария', code: 'Ф-2', target: 88, rate: 1.6 },
  { id: 'heat', label: 'Перегрев бетона КЖ-3', note: 'температура твердеющего бетона выше 35 °C', code: 'КЖ-3', target: 37.8, rate: 1.4 },
  { id: 'frost', label: 'Мороз на захватке КЖ-1', note: 'бетон остывает ниже +5 °C — прогрев не держит', code: 'КЖ-1', target: 3.2, rate: 1.2 },
  { id: 'settle', label: 'Осадка марки ГМ-07', note: 'осадка переходит допуск 15 мм', code: 'ГМ-07', target: 16.3, rate: 0.35 },
  { id: 'crack', label: 'Трещина ТР-1 раскрывается', note: 'раскрытие уходит за 0,30 мм', code: 'ТР-1', target: 0.34, rate: 0.012 },
  { id: 'offline', label: 'Обрыв связи ТП-1', note: 'датчик ЭОМ-ТП перестаёт присылать пакеты', offline: 'ЭОМ-ТП' },
];

const NOISE = { temperature: 0.2, strength: 0, settlement: 0.03, load: 0.9, crack: 0.004, pressure: 0.007, power: 2.2 };

/** Шум, похожий на нормальный: сумма трёх равномерных. */
const noise = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
const p2 = (n) => String(n).padStart(2, '0');

export const num = (value, decimals) => value.toFixed(Math.max(0, decimals)).replace('.', ',');
export const formatValue = (s, value) => `${num(value, s.decimals)} ${s.unit}`;
export const hhmmss = (d) => `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
export const hhmm = (d) => `${p2(d.getHours())}:${p2(d.getMinutes())}`;
export const ruDateTime = (d) => `${p2(d.getDate())}.${p2(d.getMonth() + 1)}.${d.getFullYear()} ${hhmmss(d)}`;

/** Допуск для подписи: «5,0…35,0 °C», «≤ 15,0 мм» или «—». */
export function limitText(s) {
  if (s.alarmLow !== undefined && s.alarmHigh !== undefined) return `${num(s.alarmLow, s.decimals)}…${num(s.alarmHigh, s.decimals)} ${s.unit}`;
  if (s.alarmHigh !== undefined) return `≤ ${num(s.alarmHigh, s.decimals)} ${s.unit}`;
  if (s.alarmLow !== undefined) return `≥ ${num(s.alarmLow, s.decimals)} ${s.unit}`;
  return '—';
}

export function alarmLimit(s) {
  if (s.alarmHigh !== undefined) return s.alarmHigh;
  if (s.alarmLow !== undefined) return s.alarmLow;
  return null;
}

/** Состояние по значению. «Нет связи» определяется не значением, а тишиной в эфире. */
export function evaluate(s, value) {
  if ((s.alarmLow !== undefined && value < s.alarmLow) || (s.alarmHigh !== undefined && value > s.alarmHigh)) return 'alarm';
  if ((s.warnLow !== undefined && value < s.warnLow) || (s.warnHigh !== undefined && value > s.warnHigh)) return 'warning';
  return 'ok';
}

function crossed(s, value, level) {
  const lo = level === 'alarm' ? s.alarmLow : s.warnLow;
  const hi = level === 'alarm' ? s.alarmHigh : s.warnHigh;
  if (hi !== undefined && value > hi) return `${num(hi, s.decimals)} ${s.unit}`;
  if (lo !== undefined && value < lo) return `${num(lo, s.decimals)} ${s.unit}`;
  return limitText(s);
}

export const LEVEL_LABEL = { warning: 'Предупреждение', alarm: 'Авария', offline: 'Нет связи' };
export const STATE_LABEL = { ok: 'В допуске', warning: 'У границы допуска', alarm: 'Вне допуска', offline: 'Нет связи' };
export const GLYPH = { ok: '●', warning: '▲', alarm: '▲', offline: '✕' };

const HISTORY_LIMIT = 900;
const STALE_MS = 20_000;
let alarmSeq = 0;

export function createSim({ tickMs = 2000, backfillMin = 60 } = {}) {
  const listeners = new Set();
  /** Состояние каждого датчика: рабочее значение, цель дрейфа, история, время последнего пакета. */
  const items = SENSORS.map((spec, index) => ({
    spec,
    index,
    id: `sen-${spec.code}`,
    base: spec.base,
    value: spec.base,
    target: spec.base,
    rate: Math.max(Math.abs(spec.base) * 0.08, 0.02),
    reading: spec.base,
    state: 'ok',
    lastTs: Date.now(),
    manualUntil: 0,
    history: [],
  }));
  const byCode = new Map(items.map((it) => [it.spec.code, it]));
  const offline = new Set();
  const alarms = [];
  const packets = [];
  let scenario = 'normal';
  let tickNo = 0;
  let timer = null;

  function step(atMs) {
    tickNo += 1;
    for (const it of items) {
      const { spec } = it;
      const calm = it.target === it.base;
      if (spec.kind === 'strength') {
        it.base = Math.min(99, it.base + 0.06); // бетон набирает прочность
        it.target = it.base;
      }
      if (spec.kind === 'settlement' && calm) {
        it.base += 0.002; // медленная консолидация основания
        it.target = it.base;
      }
      const diff = it.target - it.value;
      it.value += Math.sign(diff) * Math.min(Math.abs(diff), it.rate);
      const daily = spec.kind === 'temperature' && calm ? Math.sin(tickNo / 12) * 1.1 : 0;
      const raw = it.value + daily + (NOISE[spec.kind] ?? 0) * noise();
      it.reading = Number(raw.toFixed(spec.decimals));

      if (offline.has(spec.code)) continue; // молчащий датчик пакет не прислал
      it.lastTs = atMs;
      it.history.push({ t: atMs, v: it.reading });
      if (it.history.length > HISTORY_LIMIT) it.history.shift();
    }
  }

  /** Состояние с учётом тишины в эфире и журнал аварий по переходам. */
  function refresh(atMs) {
    let accepted = 0;
    for (const it of items) {
      const silent = atMs - it.lastTs > Math.max(STALE_MS, it.spec.interval * 4000);
      const next = silent ? 'offline' : evaluate(it.spec, it.reading);
      if (!silent) accepted += 1;
      if (next !== it.state) {
        it.state = next;
        syncAlarm(it, atMs);
      } else {
        it.state = next;
      }
    }
    return accepted;
  }

  function openAlarmFor(code) {
    return alarms.find((a) => a.code === code && a.state !== 'closed');
  }

  function syncAlarm(it, atMs) {
    const open = openAlarmFor(it.spec.code);
    if (it.state === 'ok') {
      if (open) {
        open.state = 'closed';
        open.closedAt = atMs;
        open.note = 'параметр вернулся в допуск';
      }
      return;
    }
    const level = it.state;
    const limit = level === 'offline' ? '—' : crossed(it.spec, it.reading, level);
    if (open) {
      // Предупреждение переросло в аварию — это та же авария, у неё меняется уровень.
      open.level = level;
      open.value = it.reading;
      open.limit = limit;
      open.updatedAt = atMs;
      return;
    }
    alarmSeq += 1;
    alarms.unshift({
      id: `alm-${alarmSeq}`,
      code: it.spec.code,
      name: it.spec.name,
      axis: it.spec.axis,
      level,
      value: it.reading,
      limit,
      openedAt: atMs,
      updatedAt: atMs,
      closedAt: null,
      state: 'open',
      note: level === 'offline' ? 'нет пакетов дольше четырёх периодов опроса' : 'значение вне проектного допуска',
    });
  }

  function snapshotSensors() {
    return items.map((it) => ({
      id: it.id,
      index: it.index,
      code: it.spec.code,
      name: it.spec.name,
      axis: it.spec.axis,
      discipline: it.spec.discipline,
      kind: it.spec.kind,
      unit: it.spec.unit,
      decimals: it.spec.decimals,
      pos: it.spec.pos,
      state: it.state,
      raw: it.reading,
      value: formatValue(it.spec, it.reading),
      limit: limitText(it.spec),
      limitValue: alarmLimit(it.spec),
      spec: it.spec,
      lastTs: it.lastTs,
      manual: it.manualUntil > Date.now(),
    }));
  }

  function emit() {
    const data = snapshotSensors();
    for (const fn of listeners) fn(data);
  }

  /** История за окно, мс. Возвращает точки и подписи времени. */
  function series(code, windowMs) {
    const it = byCode.get(code);
    if (!it) return [];
    const from = Date.now() - windowMs;
    return it.history.filter((p) => p.t >= from);
  }

  function applyScenario(id) {
    const sc = SCENARIOS.find((s) => s.id === id);
    if (!sc) return;
    scenario = id;
    if (id === 'normal') {
      for (const it of items) {
        it.target = it.base;
        it.rate = Math.max(Math.abs(it.base) * 0.08, 0.02);
        it.lastTs = Date.now();
      }
      offline.clear();
    }
    if (sc.code) {
      const it = byCode.get(sc.code);
      if (it) {
        it.target = sc.target;
        it.rate = sc.rate;
      }
    }
    if (sc.offline) offline.add(sc.offline);
    tick();
  }

  /** Ручной ввод с пульта: значение уходит сразу, дальше датчик держит его как рабочее. */
  function setValue(code, value) {
    const it = byCode.get(code);
    if (!it) return;
    it.value = value;
    it.target = value;
    it.base = value;
    it.rate = Math.max(Math.abs(value) * 0.08, 0.02);
    it.manualUntil = Date.now() + 120_000;
    offline.delete(code);
    tick();
  }

  function act(id, action) {
    const alarm = alarms.find((a) => a.id === id);
    if (!alarm) return;
    if (action === 'ack' && alarm.state === 'open') alarm.state = 'ack';
    if (action === 'close') {
      alarm.state = 'closed';
      alarm.closedAt = Date.now();
      alarm.note = 'закрыта оператором';
    }
    emit();
  }

  function tick() {
    const now = Date.now();
    step(now);
    const accepted = refresh(now);
    packets.unshift({ ts: now, device: 'gw-demo-01', accepted, silent: offline.size });
    if (packets.length > 80) packets.pop();
    emit();
  }

  function reset() {
    alarms.length = 0;
    packets.length = 0;
    offline.clear();
    for (const it of items) {
      it.base = it.spec.base;
      it.value = it.spec.base;
      it.target = it.spec.base;
      it.reading = it.spec.base;
      it.state = 'ok';
      it.history.length = 0;
      it.lastTs = Date.now();
      it.manualUntil = 0;
    }
    tickNo = 0;
    scenario = 'normal';
    backfill();
    tick();
  }

  /** Буфер шлюза: история до открытия страницы, чтобы графики не были пустыми. */
  function backfill() {
    const stepS = 15;
    const steps = Math.floor((backfillMin * 60) / stepS);
    const now = Date.now();
    for (let i = steps; i >= 1; i -= 1) step(now - i * stepS * 1000);
    refresh(now);
  }

  backfill();
  refresh(Date.now());

  return {
    items,
    sensors: snapshotSensors,
    series,
    alarms,
    packets,
    applyScenario,
    setValue,
    act,
    reset,
    tick,
    get scenario() {
      return scenario;
    },
    counts() {
      const data = snapshotSensors();
      return {
        total: data.length,
        online: data.filter((s) => s.state !== 'offline').length,
        ok: data.filter((s) => s.state === 'ok').length,
        warning: data.filter((s) => s.state === 'warning').length,
        alarm: data.filter((s) => s.state === 'alarm').length,
        offline: data.filter((s) => s.state === 'offline').length,
        openAlarms: alarms.filter((a) => a.state !== 'closed').length,
      };
    },
    onTick(fn) {
      listeners.add(fn);
      fn(snapshotSensors());
      return () => listeners.delete(fn);
    },
    start() {
      if (timer) return;
      tick();
      timer = setInterval(tick, tickMs);
    },
    stop() {
      clearInterval(timer);
      timer = null;
    },
    get running() {
      return Boolean(timer);
    },
  };
}
