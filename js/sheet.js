/**
 * Лист чертежа: рамка и основная надпись по ГОСТ 2.104 (форма 1), поле — план,
 * разрез, фасад или ведомость в зависимости от наименования листа. Тот же приём,
 * что в портале (lib/sheet.ts), только рисуется в браузере.
 */

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const W = 841; // А1 в миллиметрах по длинной стороне уменьшено до удобного viewBox
const H = 594;
const M = { left: 20, top: 5, right: 5, bottom: 5 };
const STAMP = { w: 185, h: 55 };

/** Лист рисуется в миллиметрах, а читается на экране: шрифты укрупнены, иначе подписи не разобрать. */
const TEXT_SCALE = 1.85;

const text = (x, y, s, { size = 3.6, anchor = 'start', fill = 'var(--bst-text)', mono = true, spacing = 0 } = {}) =>
  `<text x="${x}" y="${y}" font-family="var(--bst-font-${mono ? 'mono' : 'heading'})" font-size="${(size * TEXT_SCALE).toFixed(2)}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${spacing}">${esc(s)}</text>`;

const line = (x1, y1, x2, y2, { stroke = 'var(--bst-line-strong)', width = 0.4, dash = '' } = {}) =>
  `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${stroke}" stroke-width="${width}" ${dash ? `stroke-dasharray="${dash}"` : ''} fill="none" />`;

/** Поле листа: сетка осей, стены, размерные цепочки — «план». */
function planField(box) {
  const cols = 7;
  const rows = 4;
  const stepX = (box.w - 60) / (cols - 1);
  const stepY = (box.h - 70) / (rows - 1);
  const x0 = box.x + 34;
  const y0 = box.y + 30;
  const out = [];

  // Оси с марками
  for (let i = 0; i < cols; i += 1) {
    const x = x0 + i * stepX;
    out.push(line(x, y0 - 14, x, y0 + (rows - 1) * stepY + 14, { stroke: 'var(--bst-accent)', width: 0.25, dash: '6 3 1 3' }));
    out.push(`<circle cx="${x}" cy="${y0 - 20}" r="7.5" fill="none" stroke="var(--bst-line-strong)" stroke-width="0.4" />`);
    out.push(text(x, y0 - 17.4, String(i + 1), { size: 4, anchor: 'middle' }));
  }
  for (let j = 0; j < rows; j += 1) {
    const y = y0 + j * stepY;
    out.push(line(x0 - 14, y, x0 + (cols - 1) * stepX + 14, y, { stroke: 'var(--bst-accent)', width: 0.25, dash: '6 3 1 3' }));
    out.push(`<circle cx="${x0 - 20}" cy="${y}" r="7.5" fill="none" stroke="var(--bst-line-strong)" stroke-width="0.4" />`);
    out.push(text(x0 - 20, y + 2.6, ['А', 'Б', 'В', 'Г'][j] ?? '', { size: 4, anchor: 'middle' }));
  }

  // Контур здания и внутренние стены
  const bx = x0;
  const by = y0;
  const bw = (cols - 1) * stepX;
  const bh = (rows - 1) * stepY;
  out.push(`<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="none" stroke="var(--bst-line-strong)" stroke-width="1.1" />`);
  out.push(`<rect x="${bx + 3}" y="${by + 3}" width="${bw - 6}" height="${bh - 6}" fill="none" stroke="var(--bst-line-strong)" stroke-width="0.4" />`);
  out.push(line(bx + stepX * 2, by + 3, bx + stepX * 2, by + bh - 3, { width: 0.8 }));
  out.push(line(bx + 3, by + stepY * 2, bx + bw - 3, by + stepY * 2, { width: 0.8 }));

  // Проёмы ворот на нижней стене
  for (const i of [1, 3, 5]) {
    const gx = bx + stepX * i;
    out.push(`<rect x="${gx - 9}" y="${by + bh - 3}" width="18" height="6" fill="var(--bst-bg)" stroke="var(--bst-line-strong)" stroke-width="0.5" />`);
  }

  // Размерная цепочка снизу
  const dy = by + bh + 22;
  out.push(line(bx, dy, bx + bw, dy, { width: 0.4 }));
  for (let i = 0; i < cols; i += 1) {
    const x = bx + i * stepX;
    out.push(line(x, dy - 3, x, dy + 3, { width: 0.6 }));
    if (i < cols - 1) out.push(text(x + stepX / 2, dy - 2.4, '6 000', { size: 3.4, anchor: 'middle', fill: 'var(--bst-text-soft)' }));
  }
  out.push(text(bx + bw / 2, dy + 10, `${(cols - 1) * 6} 000`, { size: 3.6, anchor: 'middle', fill: 'var(--bst-text-soft)' }));

  // Отметка уровня
  out.push(`<path d="M${bx + bw / 2} ${by + bh / 2 - 6}l4 6h-8z" fill="none" stroke="var(--bst-line-strong)" stroke-width="0.5" />`);
  out.push(text(bx + bw / 2 + 7, by + bh / 2 - 6, '0,000', { size: 3.6 }));

  // Экспликация в углу поля
  const ex = bx + bw - 120;
  const ey = by + 8;
  out.push(`<rect x="${ex}" y="${ey}" width="116" height="34" fill="none" stroke="var(--bst-line-strong)" stroke-width="0.4" />`);
  out.push(text(ex + 3, ey + 7, 'ЭКСПЛИКАЦИЯ ПОМЕЩЕНИЙ', { size: 3.2, fill: 'var(--bst-text-mute)' }));
  ['1  Доильный зал  384,0 м²', '2  Стойловое помещение  2 140 м²', '3  Молочный блок  96,0 м²'].forEach((row, i) => {
    out.push(text(ex + 3, ey + 14 + i * 6.5, row, { size: 3.4 }));
  });

  return out.join('');
}

/** Поле листа: разрез или фасад. */
function sectionField(box, kind) {
  const x0 = box.x + 60;
  const y0 = box.y + 40;
  const w = box.w - 140;
  const h = box.h - 120;
  const out = [];

  out.push(`<rect x="${x0}" y="${y0 + h * 0.35}" width="${w}" height="${h * 0.65}" fill="none" stroke="var(--bst-line-strong)" stroke-width="1" />`);
  out.push(`<path d="M${x0} ${y0 + h * 0.35}L${x0 + w / 2} ${y0}L${x0 + w} ${y0 + h * 0.35}" fill="none" stroke="var(--bst-line-strong)" stroke-width="1" />`);

  // Колонны и связи
  for (let i = 1; i < 6; i += 1) {
    const x = x0 + (w / 6) * i;
    out.push(line(x, y0 + h * 0.35, x, y0 + h, { width: 0.45, dash: kind === 'facade' ? '' : '4 2' }));
  }
  if (kind === 'facade') {
    for (let i = 0; i < 6; i += 1) {
      const x = x0 + (w / 6) * i + 8;
      out.push(`<rect x="${x}" y="${y0 + h * 0.55}" width="${w / 6 - 16}" height="${h * 0.18}" fill="none" stroke="var(--bst-line-strong)" stroke-width="0.45" />`);
    }
  }

  // Отметки уровней
  const marks = [
    { y: y0 + h, label: '0,000' },
    { y: y0 + h * 0.35, label: '+7,200' },
    { y: y0, label: '+10,000' },
  ];
  for (const m of marks) {
    out.push(line(x0 - 28, m.y, x0 + w + 20, m.y, { stroke: 'var(--bst-accent)', width: 0.25, dash: '6 3' }));
    out.push(`<path d="M${x0 - 28} ${m.y}l5 -4v8z" fill="var(--bst-line-strong)" />`);
    out.push(text(x0 - 22, m.y - 3, m.label, { size: 3.6 }));
  }
  return out.join('');
}

/** Поле листа: ведомость или общие данные. */
function tableField(box, rows) {
  const x0 = box.x + 30;
  const y0 = box.y + 26;
  const w = box.w - 60;
  const rowH = 11;
  const cols = [0.12, 0.58, 0.16, 0.14];
  const out = [`<rect x="${x0}" y="${y0}" width="${w}" height="${(rows.length + 1) * rowH}" fill="none" stroke="var(--bst-line-strong)" stroke-width="0.6" />`];

  let cx = x0;
  for (const c of cols.slice(0, -1)) {
    cx += w * c;
    out.push(line(cx, y0, cx, y0 + (rows.length + 1) * rowH, { width: 0.4 }));
  }
  for (let i = 0; i <= rows.length; i += 1) {
    out.push(line(x0, y0 + i * rowH, x0 + w, y0 + i * rowH, { width: i === 1 ? 0.6 : 0.3 }));
  }

  const head = ['Лист', 'Наименование', 'Формат', 'Прим.'];
  let hx = x0;
  head.forEach((h, i) => {
    out.push(text(hx + 3, y0 + 7.4, h, { size: 3.6, fill: 'var(--bst-text-mute)' }));
    hx += w * cols[i];
  });

  rows.forEach((r, i) => {
    let rx = x0;
    [r.code, r.name, r.format, r.note ?? ''].forEach((cell, j) => {
      out.push(text(rx + 3, y0 + (i + 2) * rowH - 3.6, cell, { size: 3.6 }));
      rx += w * cols[j];
    });
  });

  return out.join('');
}

/** Основная надпись по ГОСТ 2.104, форма 1. */
function titleBlock(box, { asset, sheet, section }) {
  const x = box.x + box.w - STAMP.w;
  const y = box.y + box.h - STAMP.h;
  const out = [`<rect x="${x}" y="${y}" width="${STAMP.w}" height="${STAMP.h}" fill="var(--bst-raised)" stroke="var(--bst-line-strong)" stroke-width="0.8" />`];

  // Левая графа: изменения
  const leftW = 65;
  out.push(line(x + leftW, y, x + leftW, y + STAMP.h, { width: 0.6 }));
  for (let i = 1; i < 5; i += 1) out.push(line(x, y + i * 7, x + leftW, y + i * 7, { width: 0.3 }));
  ['Изм.', 'Лист', '№ докум.', 'Подп.', 'Дата'].forEach((s, i) => out.push(text(x + 2, y + 5 + i * 7, s, { size: 3, fill: 'var(--bst-text-mute)' })));
  ['Разраб.', 'Пров.', 'Н. контр.', 'ГИП'].forEach((s, i) => out.push(text(x + 24, y + 5 + i * 7, s, { size: 3, fill: 'var(--bst-text-mute)' })));
  [sheet.author, 'Сагинтаев Е.', 'Сагинтаев Е.', asset.chief].forEach((s, i) => out.push(text(x + 40, y + 5 + i * 7, s, { size: 3 })));

  // Центральная графа: наименование
  const midW = 80;
  out.push(line(x + leftW + midW, y, x + leftW + midW, y + STAMP.h, { width: 0.6 }));
  // Ширина графы 80 мм: длинные наименования подрезаем, иначе текст вылезет за рамку.
  const fit = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
  out.push(text(x + leftW + 4, y + 10, fit(asset.shortName, 22), { size: 4.2, mono: false }));
  out.push(text(x + leftW + 4, y + 20, fit(sheet.name, 26), { size: 3.4 }));
  out.push(line(x + leftW, y + 26, x + leftW + midW, y + 26, { width: 0.4 }));
  out.push(text(x + leftW + 4, y + 33, fit(`${section.code} · ${section.name}`, 30), { size: 3, fill: 'var(--bst-text-soft)' }));
  out.push(text(x + leftW + 4, y + 41, `Масштаб ${sheet.scale}`, { size: 3.4 }));
  out.push(text(x + leftW + 4, y + 49, `Формат ${sheet.format}`, { size: 3.4 }));

  // Правая графа: шифр, стадия, лист
  const rx = x + leftW + midW;
  out.push(text(rx + 4, y + 9, `${asset.code}-${sheet.code}`, { size: 4.6 }));
  out.push(line(rx, y + 13, x + STAMP.w, y + 13, { width: 0.4 }));
  out.push(text(rx + 4, y + 21, 'Стадия', { size: 3, fill: 'var(--bst-text-mute)' }));
  out.push(text(rx + 4, y + 28, 'Р', { size: 4 }));
  out.push(text(rx + 16, y + 21, 'Лист', { size: 3, fill: 'var(--bst-text-mute)' }));
  out.push(text(rx + 16, y + 28, sheet.number, { size: 4 }));
  out.push(text(rx + 30, y + 21, 'Листов', { size: 3, fill: 'var(--bst-text-mute)' }));
  out.push(text(rx + 30, y + 28, String(section.sheets), { size: 4 }));
  out.push(line(rx, y + 32, x + STAMP.w, y + 32, { width: 0.4 }));
  out.push(text(rx + 4, y + 40, 'ТОО «Бек Строй Инвест»', { size: 3.2 }));
  out.push(text(rx + 4, y + 47, `Версия ${sheet.version} · ${sheet.issued ?? 'не выдан'}`, { size: 3, fill: 'var(--bst-text-soft)' }));

  return out.join('');
}

/** Маркеры замечаний нормоконтроля поверх поля. */
function remarkMarks(box, remarks) {
  return remarks
    .map((r) => {
      const x = box.x + box.w * r.x;
      const y = box.y + box.h * r.y;
      const color = r.status === 'open' ? 'var(--bst-warn)' : 'var(--bst-ok)';
      return `<g class="sheet-remark" data-remark="${esc(r.sheet)}-${r.number}" style="cursor:pointer">
        <circle cx="${x}" cy="${y}" r="7" fill="var(--bst-bg)" stroke="${color}" stroke-width="1.2" />
        <text x="${x}" y="${y + 2.4}" font-family="var(--bst-font-mono)" font-size="6" fill="${color}" text-anchor="middle">${r.number}</text>
        <circle cx="${x}" cy="${y}" r="13" fill="none" stroke="${color}" stroke-width="0.4" stroke-dasharray="3 3" />
      </g>`;
    })
    .join('');
}

/** Собирает лист целиком. Возвращает разметку SVG. */
export function drawSheet({ asset, section, sheet, remarks = [] }) {
  const inner = { x: M.left, y: M.top, w: W - M.left - M.right, h: H - M.top - M.bottom };
  const field = { x: inner.x, y: inner.y, w: inner.w, h: inner.h - STAMP.h - 6 };

  const name = sheet.name.toLowerCase();
  let body;
  if (name.includes('разрез')) body = sectionField(field, 'section');
  else if (name.includes('фасад')) body = sectionField(field, 'facade');
  else if (name.includes('общие данные') || name.includes('ведомость') || name.includes('спецификация') || name.includes('экспликация')) {
    body = tableField(
      field,
      Array.from({ length: Math.min(8, section.sheets) }, (_, i) => ({
        code: `${section.code}-${String(i + 1).padStart(2, '0')}`,
        name: sheet.name.includes('Общие данные') ? `Лист ${i + 1} комплекта ${section.code}` : `Позиция ${i + 1}`,
        format: i === 0 ? 'А3' : 'А1',
        note: i === 0 ? 'выдан' : '',
      })),
    );
  } else body = planField(field);

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block;height:auto;background:var(--bst-raised)" role="img" aria-label="Лист ${esc(sheet.code)}: ${esc(sheet.name)}">
    <rect x="0" y="0" width="${W}" height="${H}" fill="var(--bst-raised)" stroke="var(--bst-line)" stroke-width="0.5" />
    <rect x="${inner.x}" y="${inner.y}" width="${inner.w}" height="${inner.h}" fill="none" stroke="var(--bst-line-strong)" stroke-width="1.2" />
    ${body}
    ${remarkMarks(field, remarks)}
    ${titleBlock(inner, { asset, sheet, section })}
  </svg>`;
}
