/**
 * Графики в чертёжной стилистике: только линии, пороги пунктиром, никаких заливок.
 * Каждая функция возвращает готовую разметку SVG — так экран собирается одной строкой.
 */

import { hhmm, num } from './sim.js';

const PAD = { left: 54, right: 18, top: 18, bottom: 34 };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const tick = (v, decimals) => num(v, decimals);

/**
 * Линейный график по нескольким сериям.
 * series: [{ code, label, points: [{t, v}], color, dashed, marker }]
 */
export function lineChart({ series, min, max, decimals = 1, unit = '', thresholds = [], height = 260, width = 880 }) {
  const plotW = width - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;
  const all = series.flatMap((s) => s.points);
  if (!all.length) return emptyChart(height, 'Нет данных за выбранное окно');

  const t0 = Math.min(...all.map((p) => p.t));
  const t1 = Math.max(...all.map((p) => p.t));
  const lo = min !== undefined ? min : Math.min(...all.map((p) => p.v), ...thresholds.map((t) => t.value));
  const hi = max !== undefined ? max : Math.max(...all.map((p) => p.v), ...thresholds.map((t) => t.value));
  const pad = (hi - lo) * 0.12 || 1;
  const yMin = lo - pad;
  const yMax = hi + pad;

  const xOf = (t) => PAD.left + (t1 === t0 ? plotW : (plotW * (t - t0)) / (t1 - t0));
  const yOf = (v) => PAD.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  const ticks = [yMin, yMin + (yMax - yMin) / 2, yMax].map(
    (v) => `<path d="M${PAD.left} ${yOf(v).toFixed(1)}H${width - PAD.right}" stroke="var(--bst-line)" stroke-dasharray="2 5" />
      <text x="${PAD.left - 10}" y="${(yOf(v) + 3).toFixed(1)}" text-anchor="end" font-family="var(--bst-font-mono)" font-size="9" fill="var(--bst-text-mute)">${tick(v, decimals)}</text>`,
  );

  const limits = thresholds.map(
    (t) => `<path d="M${PAD.left} ${yOf(t.value).toFixed(1)}H${width - PAD.right}" stroke="${t.color ?? 'var(--bst-alarm)'}" stroke-width="1.1" stroke-dasharray="6 3" />
      <text x="${PAD.left + 6}" y="${(yOf(t.value) - 6).toFixed(1)}" font-family="var(--bst-font-mono)" font-size="9" fill="${t.color ?? 'var(--bst-alarm)'}">${esc(t.label)}</text>`,
  );

  const lines = series.map((s) => {
    const pts = s.points.map((p) => `${xOf(p.t).toFixed(1)},${yOf(p.v).toFixed(1)}`).join(' ');
    const last = s.points[s.points.length - 1];
    const marker = last
      ? `<circle cx="${xOf(last.t).toFixed(1)}" cy="${yOf(last.v).toFixed(1)}" r="3.6" fill="var(--bst-bg)" stroke="${s.color ?? 'var(--bst-accent)'}" stroke-width="2" />`
      : '';
    return `<polyline points="${pts}" fill="none" stroke="${s.color ?? 'var(--bst-accent)'}" stroke-width="${s.dashed ? 1.3 : 1.9}" ${s.dashed ? 'stroke-dasharray="5 4"' : ''} />${marker}`;
  });

  const xLabels = [t0, (t0 + t1) / 2, t1].map((t, i) => {
    const anchor = i === 0 ? 'start' : i === 2 ? 'end' : 'middle';
    return `<text x="${xOf(t).toFixed(1)}" y="${height - 12}" text-anchor="${anchor}" font-family="var(--bst-font-mono)" font-size="9" fill="var(--bst-text-mute)">${hhmm(new Date(t))}</text>`;
  });

  return `<svg viewBox="0 0 ${width} ${height}" width="100%" style="display:block;height:auto" role="img" aria-label="${esc(series.map((s) => s.label).join(', '))}">
    <path d="M${PAD.left} ${PAD.top}V${PAD.top + plotH}M${PAD.left} ${PAD.top + plotH}H${width - PAD.right}" stroke="var(--bst-line-strong)" fill="none" />
    ${ticks.join('')}${limits.join('')}${lines.join('')}${xLabels.join('')}
    ${unit ? `<text x="${PAD.left}" y="12" font-family="var(--bst-font-mono)" font-size="9" fill="var(--bst-text-mute)">${esc(unit)}</text>` : ''}
  </svg>`;
}

/** Столбики: нагрузка ферм и другие мгновенные сравнения. */
export function barChart({ bars, max, threshold, unit = '', height = 240, width = 560 }) {
  const plotW = width - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;
  const yOf = (v) => PAD.top + plotH - (v / max) * plotH;
  const slot = plotW / Math.max(1, bars.length);
  const barW = Math.min(44, slot * 0.54);

  const grid = [0, 0.25, 0.5, 0.75, 1].map(
    (f) => `<path d="M${PAD.left} ${yOf(max * f).toFixed(1)}H${width - PAD.right}" stroke="var(--bst-line)" stroke-dasharray="2 5" />
      <text x="${PAD.left - 10}" y="${(yOf(max * f) + 3).toFixed(1)}" text-anchor="end" font-family="var(--bst-font-mono)" font-size="9" fill="var(--bst-text-mute)">${Math.round(max * f)}</text>`,
  );

  const limit = threshold
    ? `<path d="M${PAD.left} ${yOf(threshold.value).toFixed(1)}H${width - PAD.right}" stroke="var(--bst-alarm)" stroke-width="1.1" stroke-dasharray="6 3" />
       <text x="${PAD.left + 6}" y="${(yOf(threshold.value) - 6).toFixed(1)}" font-family="var(--bst-font-mono)" font-size="9" fill="var(--bst-alarm)">${esc(threshold.label)}</text>`
    : '';

  const cols = bars.map((b, i) => {
    const cx = PAD.left + slot * i + slot / 2;
    const y = yOf(b.value);
    const color = b.state === 'alarm' ? 'var(--bst-alarm)' : b.state === 'warning' ? 'var(--bst-warn)' : b.state === 'offline' ? 'var(--bst-offline)' : 'var(--bst-accent)';
    const fill = b.state === 'alarm' ? 'var(--bst-alarm-tint)' : b.state === 'warning' ? 'var(--bst-warn-tint)' : b.state === 'offline' ? 'var(--bst-offline-tint)' : 'var(--bst-accent-tint)';
    return `<rect x="${(cx - barW / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(0, PAD.top + plotH - y).toFixed(1)}" fill="${fill}" stroke="${color}" stroke-width="${b.state === 'ok' ? 1 : 1.6}" />
      <text x="${cx.toFixed(1)}" y="${(y - 7).toFixed(1)}" text-anchor="middle" font-family="var(--bst-font-mono)" font-size="9.5" fill="${color}">${b.value}</text>
      <text x="${cx.toFixed(1)}" y="${height - 14}" text-anchor="middle" font-family="var(--bst-font-mono)" font-size="9" fill="var(--bst-text-mute)">${esc(b.label)}</text>`;
  });

  return `<svg viewBox="0 0 ${width} ${height}" width="100%" style="display:block;height:auto" role="img" aria-label="${esc(unit || 'Диаграмма')}">
    <path d="M${PAD.left} ${PAD.top}V${PAD.top + plotH}M${PAD.left} ${PAD.top + plotH}H${width - PAD.right}" stroke="var(--bst-line-strong)" fill="none" />
    ${grid.join('')}${limit}${cols.join('')}
  </svg>`;
}

/** Компактная динамика параметра для карточки датчика и аварии. */
export function sparkline({ points, color = 'var(--bst-accent)', threshold, width = 430, height = 130, decimals = 1 }) {
  if (!points.length) return emptyChart(height, 'Нет данных');
  const values = points.map((p) => p.v);
  const lo = Math.min(...values, threshold ?? Infinity);
  const hi = Math.max(...values, threshold ?? -Infinity);
  const pad = (hi - lo) * 0.15 || Math.max(Math.abs(hi) * 0.1, 0.5);
  const yMin = lo - pad;
  const yMax = hi + pad;
  const yOf = (v) => height - 22 - ((v - yMin) / (yMax - yMin)) * (height - 44);
  const xOf = (i) => 38 + ((width - 56) * i) / Math.max(1, points.length - 1);
  const last = points[points.length - 1];

  const limit =
    threshold !== undefined && threshold !== null
      ? `<path d="M38 ${yOf(threshold).toFixed(1)}H${width - 12}" stroke="${color}" stroke-width="1.1" stroke-dasharray="6 3" />
         <text x="42" y="${(yOf(threshold) - 6).toFixed(1)}" font-family="var(--bst-font-mono)" font-size="8.5" fill="${color}">ПОРОГ ${num(threshold, decimals)}</text>`
      : '';

  return `<svg viewBox="0 0 ${width} ${height}" width="100%" style="display:block;height:auto;border:1px solid var(--bst-line)" aria-hidden="true">
    <path d="M38 12V${height - 22}M38 ${height - 22}H${width - 12}" stroke="var(--bst-line-strong)" fill="none" />
    ${limit}
    <polyline points="${points.map((p, i) => `${xOf(i).toFixed(1)},${yOf(p.v).toFixed(1)}`).join(' ')}" fill="none" stroke="var(--bst-accent)" stroke-width="1.9" />
    <circle cx="${xOf(points.length - 1).toFixed(1)}" cy="${yOf(last.v).toFixed(1)}" r="4.5" fill="var(--bst-bg)" stroke="${color}" stroke-width="2" />
    <text x="38" y="10" font-family="var(--bst-font-mono)" font-size="8.5" fill="var(--bst-text-mute)">${num(yMax, decimals)}</text>
    <text x="38" y="${height - 6}" font-family="var(--bst-font-mono)" font-size="8.5" fill="var(--bst-text-mute)">${num(yMin, decimals)}</text>
  </svg>`;
}

function emptyChart(height, text) {
  return `<div class="bst-mono" style="display:grid;place-items:center;height:${height}px;border:1px solid var(--bst-line);font-size:11px;color:var(--bst-text-mute)">${esc(text)}</div>`;
}
