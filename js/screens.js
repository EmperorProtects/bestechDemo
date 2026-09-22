/**
 * Экраны кабинета: вход, список объектов, лист объекта, исходные данные,
 * документация и просмотр листа с замечаниями. Каждая функция возвращает разметку,
 * обработчики вешает app.js — так экраны остаются простыми строками.
 */

import { ASSETS, COMPLETENESS, DOC_STATUS, EVENTS, INPUTS, INPUT_STATE, METRICS, ORG, REMARKS, SECTIONS, STAGE_COLOR, STAGE_LABELS, USERS, sheetsOf } from './data.js';
import { drawSheet } from './sheet.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const SEVERITY = { alarm: 'var(--bst-alarm)', warning: 'var(--bst-warn)', ok: 'var(--bst-ok)', info: 'var(--bst-accent-ink)' };
const SEVERITY_GLYPH = { alarm: '▲', warning: '▲', ok: '●', info: '○' };

const frame = (inner, cls = '', style = '') =>
  `<div class="bst-frame ${cls}" ${style ? `style="${style}"` : ''}>
    <i class="bst-corner bst-corner--tl"></i><i class="bst-corner bst-corner--tr"></i>
    <i class="bst-corner bst-corner--bl"></i><i class="bst-corner bst-corner--br"></i>
    ${inner}
  </div>`;

const eyebrow = (title, aside = '') =>
  `<div class="panel-head bst-mono"><span class="bst-eyebrow">◭ ${esc(title)}</span>${aside ? `<span class="muted" style="margin-left:auto">${aside}</span>` : ''}</div>`;

const stamp = (color, glyph, label) => `<span class="bst-stamp" style="color:${color}"><span aria-hidden="true">${glyph}</span>${esc(label)}</span>`;

/* ── Схемы объектов ───────────────────────────────────────────────────────── */

const FIGURES = {
  barn: '<path d="M14 60h92V30L60 12 14 30z" /><path d="M14 60h92" /><path d="M30 60V38h60v22" /><path d="M46 60V46h12v14" /><path d="M8 66h104" stroke-dasharray="4 3" />',
  intake: '<circle cx="60" cy="38" r="18" /><path d="M14 60h92M42 38H18M78 38h24M60 20v-8M60 56v10" /><path d="M8 66h104" stroke-dasharray="4 3" />',
  mill: '<path d="M26 60V22h30v38M56 60V34h32v26" /><path d="M14 60h92M34 30h14M64 42h16" /><path d="M8 66h104" stroke-dasharray="4 3" />',
};

const figure = (kind) =>
  `<svg viewBox="0 0 120 72" width="100%" style="display:block;height:auto" aria-hidden="true" fill="none" stroke="var(--bst-accent)" stroke-width="1.1">${FIGURES[kind] ?? FIGURES.barn}</svg>`;

/* ── Вход ─────────────────────────────────────────────────────────────────── */

export function loginScreen() {
  return `<div class="login">
    ${frame(
      `<div class="login__body">
        <div class="bst-eyebrow" style="margin-bottom:18px">◭ ВХОД В КАБИНЕТ</div>
        <h1 class="bst-h" style="font-size:34px;line-height:1.05">BESTECH</h1>
        <p class="muted" style="margin:6px 0 24px;font-size:13.5px">Платформа проектирования, строительства и эксплуатации объектов. ${esc(ORG.name)}</p>
        <div class="login__users">
          ${USERS.map(
            (u) => `<button type="button" class="login__user" data-user="${u.id}">
              <span class="login__avatar bst-mono">${esc(u.initials)}</span>
              <span>
                <b>${esc(u.name)}</b>
                <span class="bst-mono">${esc(u.roleLabel)} · ${esc(u.position)}</span>
              </span>
            </button>`,
          ).join('')}
        </div>
        <p class="bst-mono" style="font-size:10.5px;color:var(--bst-text-mute);margin-top:22px;line-height:1.6">
          ДЕМО-СТЕНД · ПАРОЛЬ НЕ НУЖЕН · ВЫБЕРИТЕ РОЛЬ, ЧТОБЫ УВИДЕТЬ ЕЁ ПРАВА
        </p>
      </div>
      <div class="login__aside">
        <div class="bst-titleblock">
          <div class="bst-titleblock__k">ОРГАНИЗАЦИЯ</div><div class="bst-titleblock__v">${esc(ORG.name)}</div>
          <div class="bst-titleblock__k">РЕКВИЗИТЫ</div><div class="bst-titleblock__v">${esc(ORG.bin)}</div>
          <div class="bst-titleblock__k">ОБЪЕКТОВ</div><div class="bst-titleblock__v">${ASSETS.length}</div>
          <div class="bst-titleblock__k">СТАДИИ</div><div class="bst-titleblock__v">Проектирование, Строительство</div>
        </div>
      </div>`,
      'login__frame',
    )}
  </div>`;
}

/* ── Мои объекты ──────────────────────────────────────────────────────────── */

export function assetsScreen({ stage = 'all' } = {}) {
  const list = ASSETS.filter((a) => stage === 'all' || a.stage === stage);

  const cards = list
    .map((asset) => {
      const m = METRICS[asset.code];
      return frame(
        `<div class="asset-card">
          <div style="min-width:0">
            <div class="asset-card__top bst-mono">
              <span>${esc(asset.code)}</span><span class="asset-card__sep"></span><span>${esc(asset.region)}</span>
              ${stamp(STAGE_COLOR[asset.stage], '●', STAGE_LABELS[asset.stage])}
            </div>
            <h2 class="bst-h asset-card__name"><a href="#/asset/${esc(asset.code)}">${esc(asset.name)}</a></h2>
            <div class="bst-mono muted" style="font-size:11px;margin-bottom:14px">ГИП ${esc(asset.chief)} · ${esc(asset.area)} · ${esc(asset.capacity)}</div>
            <div class="asset-card__grid">
              <div>
                <div class="bst-kpi__label">Разделов ПД</div>
                <div class="bst-mono" style="font-size:15px">${esc(asset.sectionsLabel)}</div>
                <div class="muted" style="font-size:12px;margin-top:2px">стадия «Проектирование»</div>
              </div>
              <div>
                <div class="bst-kpi__label">Следующий срок</div>
                <div class="bst-mono" style="font-size:15px">${esc(asset.deadline.date)}</div>
                <div class="muted" style="font-size:12px;margin-top:2px">${esc(asset.deadline.note)}</div>
              </div>
              <div>
                <div class="bst-kpi__label">Замечания</div>
                <div class="bst-mono" style="font-size:15px;color:${asset.remarks.state === 'warning' ? 'var(--bst-warn)' : 'var(--bst-ok)'}">
                  ${asset.remarks.state === 'warning' ? '▲' : '●'} ${esc(asset.remarks.label)}
                </div>
                <div class="muted" style="font-size:12px;margin-top:2px">${esc(asset.remarks.note)}</div>
              </div>
              <div>
                <div class="bst-kpi__label">Готовность СМР</div>
                <div class="bst-mono" style="font-size:20px">${asset.progress} %</div>
                <div class="muted" style="font-size:12px;margin-top:2px">план ${asset.plannedProgress} % · отклонений ${m.deviations.total}</div>
              </div>
            </div>
          </div>
          <div class="asset-card__aside">
            <div class="bst-kpi__label" style="margin-bottom:8px">Схема объекта</div>
            <div class="bst-axisgrid" style="border:1px solid var(--bst-line);padding:8px">${figure(asset.figure)}</div>
            <div class="asset-card__rows bst-mono">
              <div><span class="muted">ДОГОВОР</span><span>${esc(asset.contract)}</span></div>
              <div><span class="muted">ОБНОВЛЕНО</span><span>${esc(asset.updated)}</span></div>
            </div>
            <div style="display:grid;gap:8px;margin-top:12px">
              <a class="bst-btn bst-btn--block" href="#/asset/${esc(asset.code)}">Открыть лист объекта</a>
              <a class="bst-btn bst-btn--subtle bst-btn--block" href="#/asset/${esc(asset.code)}/documents">Чертежи и документация</a>
            </div>
          </div>
        </div>`,
        'asset-frame',
      );
    })
    .join('');

  return `<div class="page">
    <div class="panel-head bst-mono" style="border:1px solid var(--bst-line);background:var(--bst-surface)">
      <span class="bst-eyebrow">◭ МОИ ОБЪЕКТЫ · ${list.length} ИЗ ${ASSETS.length}</span>
      <span class="bst-seg" role="group" aria-label="Фильтр по стадии" id="stageFilter" style="margin-left:auto">
        ${[['all', 'ВСЕ'], ['design', 'ПРОЕКТИРОВАНИЕ'], ['construction', 'СТРОИТЕЛЬСТВО'], ['operation', 'ЭКСПЛУАТАЦИЯ']]
          .map(([v, l]) => `<button type="button" class="bst-seg__opt" data-stage="${v}" aria-pressed="${v === stage}">${l}</button>`)
          .join('')}
      </span>
    </div>
    ${cards || `<div class="bst-empty"><h3 class="bst-h" style="font-size:20px">Объектов на этой стадии нет</h3></div>`}
  </div>`;
}

/* ── Лист объекта ─────────────────────────────────────────────────────────── */

export function assetScreen(code) {
  const asset = ASSETS.find((a) => a.code === code);
  if (!asset) return notFound();
  const m = METRICS[code];
  const comp = COMPLETENESS[code];
  const events = EVENTS[code] ?? [];
  const stages = ['design', 'construction', 'operation'];
  const current = stages.indexOf(asset.stage);

  const steps = stages
    .map((s, i) => {
      const state = i < current ? 'done' : i === current ? 'current' : 'todo';
      const note =
        s === 'design' ? asset.sectionsLabel : s === 'construction' ? 'двойник, телеметрия, ход СМР' : 'паспорт, приборы учёта, ППР';
      return `<div class="bst-stepper__step" data-state="${state}">
        <div class="bst-stepper__k">${String(i + 1).padStart(2, '0')} · ${state === 'done' ? 'ЗАВЕРШЕНО' : state === 'current' ? 'ТЕКУЩАЯ СТАДИЯ' : 'ОЖИДАЕТ'}</div>
        <div class="bst-stepper__t">${STAGE_LABELS[s]}</div>
        <div class="bst-stepper__n">${esc(note)}</div>
      </div>`;
    })
    .join('');

  const kpi = [
    { label: 'Комплектность исходных данных', value: `${comp.percent}`, unit: '%', foot: `${comp.missing.length} документов не хватает`, color: comp.percent >= 90 ? 'var(--bst-ok)' : 'var(--bst-warn)' },
    { label: 'Разделы ПД выданы', value: (SECTIONS[code] ?? []).filter((s) => s.status === 'issued').length, unit: `/${(SECTIONS[code] ?? []).length}`, foot: asset.sectionsLabel },
    { label: 'Открытых замечаний', value: m.remarksOpen.count, foot: `${m.remarksOpen.sheets} · ${m.remarksOpen.due}`, color: m.remarksOpen.count ? 'var(--bst-warn)' : 'var(--bst-ok)' },
    { label: 'Отклонений в двойнике', value: m.deviations.total, foot: `${m.deviations.alarm} вне допуска · ${m.deviations.parameters} параметров`, color: m.deviations.alarm ? 'var(--bst-alarm)' : 'var(--bst-ok)' },
  ];

  return `<div class="page">
    <div class="kpi-row">
      ${kpi
        .map(
          (t) => `<div class="kpi">
            <div class="bst-kpi__label">${esc(t.label)}</div>
            <div class="kpi__value" ${t.color ? `style="color:${t.color}"` : ''}>${t.value}${t.unit ? `<small>${esc(t.unit)}</small>` : ''}</div>
            <div class="kpi__foot">${esc(t.foot)}</div>
          </div>`,
        )
        .join('')}
    </div>

    <div class="bst-stepper">${steps}</div>

    <div class="asset-split">
      ${frame(
        `${eyebrow('ЛЕНТА СОБЫТИЙ ОБЪЕКТА', `${events.length} записей`)}
        <div class="events">
          ${events
            .map(
              (e) => `<div class="event">
                <span class="event__glyph" style="color:${SEVERITY[e.severity]}">${SEVERITY_GLYPH[e.severity]}</span>
                <span class="event__body">
                  <span class="event__title">${esc(e.title)}</span>
                  <span class="event__meta bst-mono">${esc(e.date)} · ${esc(e.meta)}</span>
                </span>
                ${e.href ? `<a class="bst-btn bst-btn--sm" href="${esc(e.href)}">${esc(e.action)}</a>` : ''}
              </div>`,
            )
            .join('')}
        </div>`,
      )}

      ${frame(
        `${eyebrow('ПАСПОРТ ОБЪЕКТА')}
        <div class="bst-titleblock" style="margin:14px">
          <div class="bst-titleblock__k">ШИФР</div><div class="bst-titleblock__v">${esc(asset.code)}</div>
          <div class="bst-titleblock__k">АДРЕС</div><div class="bst-titleblock__v">${esc(asset.address)}</div>
          <div class="bst-titleblock__k">ПЛОЩАДЬ</div><div class="bst-titleblock__v">${esc(asset.area)}</div>
          <div class="bst-titleblock__k">МОЩНОСТЬ</div><div class="bst-titleblock__v">${esc(asset.capacity)}</div>
          <div class="bst-titleblock__k">ГИП</div><div class="bst-titleblock__v">${esc(asset.chief)}</div>
          <div class="bst-titleblock__k">ДОГОВОР</div><div class="bst-titleblock__v">${esc(asset.contract)}</div>
          <div class="bst-titleblock__k">ДАТЧИКИ</div><div class="bst-titleblock__v">${asset.sensors.total ? `${asset.sensors.online} из ${asset.sensors.total}` : '—'}</div>
        </div>
        <div style="display:grid;gap:8px;margin:0 14px 14px">
          <a class="bst-btn bst-btn--block" href="#/asset/${esc(asset.code)}/inputs">Исходные данные</a>
          <a class="bst-btn bst-btn--block" href="#/asset/${esc(asset.code)}/documents">Документация и чертежи</a>
          ${asset.hasTwin ? `<a class="bst-btn bst-btn--primary bst-btn--block" href="#/twin/${esc(asset.code)}">Цифровой двойник</a>` : ''}
        </div>`,
      )}
    </div>
  </div>`;
}

/* ── Исходные данные ──────────────────────────────────────────────────────── */

export function inputsScreen(code) {
  const asset = ASSETS.find((a) => a.code === code);
  if (!asset) return notFound();
  const docs = INPUTS[code] ?? [];
  const comp = COMPLETENESS[code];

  return `<div class="page">
    <div class="inputs-split">
      ${frame(
        `${eyebrow('КОМПЛЕКТНОСТЬ ИСХОДНЫХ ДАННЫХ', `${comp.percent} %`)}
        <div style="padding:14px">
          <div class="bst-mono" style="font-size:34px;line-height:1;color:${comp.percent >= 90 ? 'var(--bst-ok)' : 'var(--bst-warn)'}">${comp.percent} <span style="font-size:15px;color:var(--bst-text-mute)">%</span></div>
          <div class="progress"><span style="width:${comp.percent}%"></span></div>
          <div class="muted bst-mono" style="font-size:10.5px;margin-top:6px">ПРИНЯТО ${docs.filter((d) => d.state === 'accepted').length} ИЗ ${docs.length} ДОКУМЕНТОВ</div>
          ${comp.missing
            .map(
              (mi) => `<div class="bst-alert" style="border-left-color:${SEVERITY[mi.severity]};background:${mi.severity === 'alarm' ? 'var(--bst-alarm-tint)' : 'var(--bst-warn-tint)'};margin-top:12px">
                <div>
                  <div class="bst-alert__title" style="color:${SEVERITY[mi.severity]}">${esc(mi.title)}</div>
                  <div class="bst-alert__note">${esc(mi.note)}</div>
                </div>
              </div>`,
            )
            .join('')}
        </div>`,
      )}

      ${frame(
        `${eyebrow('ЗАГРУЗКА ДОКУМЕНТОВ')}
        <div class="bst-dropzone" id="dropzone" data-over="false" style="margin:14px">
          <div style="font-family:var(--bst-font-heading);font-size:19px;text-transform:uppercase;letter-spacing:0.03em">Перетащите задание, АПЗ и ТУ на лист</div>
          <div class="bst-mono muted" style="font-size:11px;margin:6px 0 14px">PDF · DWG · IFC · XLSX · DOCX — до 200 МБ на файл</div>
          <button type="button" class="bst-btn bst-btn--subtle" id="pickFile">Выбрать файл</button>
        </div>
        <div class="bst-mono muted" style="margin:0 14px 14px;font-size:10.5px;line-height:1.6">
          В ДЕМО ФАЙЛЫ НЕ ОТПРАВЛЯЮТСЯ: В ПОРТАЛЕ ДОКУМЕНТ ЛОЖИТСЯ В ХРАНИЛИЩЕ, ПЕРЕСЧИТЫВАЕТСЯ КОМПЛЕКТНОСТЬ И УХОДИТ В МАСТЕРСКУЮ
        </div>`,
      )}
    </div>

    ${frame(
      `${eyebrow('ВЕДОМОСТЬ ИСХОДНЫХ ДАННЫХ')}
      <div class="table-wrap">
        <table class="bst-table">
          <thead><tr><th>Код</th><th>Документ</th><th>Файл</th><th>Дата</th><th>Состояние</th></tr></thead>
          <tbody>
            ${docs
              .map((d) => {
                const st = INPUT_STATE[d.state];
                return `<tr>
                  <td class="bst-mono" style="font-size:12px">${esc(d.code)}</td>
                  <td>${esc(d.title)}</td>
                  <td class="bst-mono" style="font-size:11.5px">${d.file ? esc(d.file) : '—'}</td>
                  <td class="bst-mono" style="font-size:11.5px">${d.date ? esc(d.date) : '—'}</td>
                  <td>${stamp(st.color, st.glyph, st.label)}</td>
                </tr>`;
              })
              .join('')}
          </tbody>
        </table>
      </div>`,
    )}
  </div>`;
}

/* ── Документация ─────────────────────────────────────────────────────────── */

export function documentsScreen(code, sectionCode) {
  const asset = ASSETS.find((a) => a.code === code);
  if (!asset) return notFound();
  const sections = SECTIONS[code] ?? [];
  const active = sections.find((s) => s.code === sectionCode) ?? sections[0];
  const sheets = active ? sheetsOf(code, active.code) : [];

  return `<div class="page">
    <div class="docs-split">
      ${frame(
        `${eyebrow('РАЗДЕЛЫ ПРОЕКТНОЙ ДОКУМЕНТАЦИИ', `${sections.length} разделов`)}
        <div class="table-wrap">
          <table class="bst-table">
            <thead><tr><th>Раздел</th><th>Наименование</th><th>Листов</th><th>Вер.</th><th>Состояние</th></tr></thead>
            <tbody id="sectionRows">
              ${sections
                .map((s) => {
                  const st = DOC_STATUS[s.status];
                  return `<tr data-section="${esc(s.code)}" data-selected="${s.code === active?.code ? 'true' : ''}" style="cursor:pointer">
                    <td class="bst-mono" style="font-size:12px">${esc(s.code)}</td>
                    <td>${esc(s.name)}</td>
                    <td class="bst-num">${s.sheets}</td>
                    <td class="bst-num">${s.version}</td>
                    <td>${stamp(st.color, st.glyph, st.label)}${s.remarks ? ` <span class="bst-badge">${s.remarks}</span>` : ''}</td>
                  </tr>`;
                })
                .join('')}
            </tbody>
          </table>
        </div>`,
      )}

      ${frame(
        `${eyebrow(`ЛИСТЫ РАЗДЕЛА ${active?.code ?? ''}`, active ? `версия ${active.version} · ${active.author}` : '')}
        <div class="sheet-list">
          ${sheets
            .map((sh) => {
              const st = DOC_STATUS[sh.status];
              return `<a class="sheet-row" href="#/asset/${esc(code)}/documents/${encodeURIComponent(sh.code)}">
                <span class="bst-mono" style="font-size:11px;color:${st.color}">${st.glyph}</span>
                <span class="bst-mono" style="font-size:11.5px">${esc(sh.code)}</span>
                <span class="sheet-row__name">${esc(sh.name)}</span>
                <span class="bst-mono muted" style="font-size:11px">${esc(sh.format)}</span>
              </a>`;
            })
            .join('')}
        </div>
        <div style="display:flex;gap:8px;padding:12px 14px;border-top:1px solid var(--bst-line)">
          <button type="button" class="bst-btn bst-btn--sm" data-demo-note="Скачивание листа">Скачать лист</button>
          <button type="button" class="bst-btn bst-btn--sm" data-demo-note="Скачивание комплекта ZIP">Комплект ZIP</button>
        </div>`,
      )}
    </div>
  </div>`;
}

/* ── Просмотр листа ───────────────────────────────────────────────────────── */

export function sheetScreen(code, sheetCode) {
  const asset = ASSETS.find((a) => a.code === code);
  if (!asset) return notFound();
  const sectionCode = sheetCode.split('-')[0];
  const section = (SECTIONS[code] ?? []).find((s) => s.code === sectionCode);
  const sheet = sheetsOf(code, sectionCode).find((s) => s.code === sheetCode);
  if (!section || !sheet) return notFound();
  const remarks = (REMARKS[code] ?? []).filter((r) => r.sheet === sheetCode);

  return `<div class="page">
    <div class="sheet-split">
      ${frame(
        `${eyebrow(`ЛИСТ ${sheet.code} · ${sheet.name}`, `${sheet.format} · масштаб ${sheet.scale}`)}
        <div class="sheet-canvas">${drawSheet({ asset, section, sheet, remarks })}</div>
        <div style="display:flex;gap:8px;padding:12px 14px;border-top:1px solid var(--bst-line);flex-wrap:wrap">
          <a class="bst-btn bst-btn--sm" href="#/asset/${esc(code)}/documents/${encodeURIComponent(sectionCode)}">К разделу ${esc(sectionCode)}</a>
          <button type="button" class="bst-btn bst-btn--sm" data-demo-note="Скачивание PDF">Скачать PDF</button>
          <button type="button" class="bst-btn bst-btn--sm" data-demo-note="Печать листа">Печать</button>
        </div>`,
      )}

      ${frame(
        `${eyebrow('ЗАМЕЧАНИЯ НОРМОКОНТРОЛЯ', remarks.length ? `${remarks.filter((r) => r.status === 'open').length} открытых` : 'нет')}
        <div class="remarks">
          ${
            remarks.length
              ? remarks
                  .map(
                    (r) => `<div class="remark" id="remark-${esc(r.sheet)}-${r.number}">
                      <div class="remark__head">
                        <span class="remark__num bst-mono">${r.number}</span>
                        ${stamp(r.status === 'open' ? 'var(--bst-warn)' : 'var(--bst-ok)', r.status === 'open' ? '▲' : '●', r.status === 'open' ? 'Открыто' : 'Закрыто')}
                        <span class="bst-mono muted" style="font-size:11px;margin-left:auto">${esc(r.date)}</span>
                      </div>
                      <div class="remark__text">${esc(r.text)}</div>
                      <div class="bst-mono muted" style="font-size:11px;margin-top:6px">${esc(r.clause)} · ${esc(r.locus)}</div>
                      <div class="thread">
                        ${r.thread
                          .map(
                            (t) => `<div class="thread__msg">
                              <span class="thread__avatar bst-mono">${esc(t.initials)}</span>
                              <span>
                                <span class="bst-mono" style="font-size:10.5px;color:var(--bst-text-mute)">${esc(t.author)} · ${esc(t.role)} · ${esc(t.at)}</span>
                                <span class="thread__text">${esc(t.text)}</span>
                              </span>
                            </div>`,
                          )
                          .join('')}
                      </div>
                    </div>`,
                  )
                  .join('')
              : `<div class="bst-empty" style="padding:24px"><h3 class="bst-h" style="font-size:18px">Замечаний нет</h3>
                 <p class="muted" style="font-size:13px;margin-top:6px">Лист прошёл нормоконтроль без замечаний.</p></div>`
          }
        </div>`,
      )}
    </div>
  </div>`;
}

function notFound() {
  return `<div class="page"><div class="bst-empty">
    <h3 class="bst-h" style="font-size:20px">Страница не найдена</h3>
    <p class="muted" style="margin:6px 0 16px">Проверьте адрес или вернитесь к списку объектов.</p>
    <a class="bst-btn bst-btn--primary" href="#/assets">К моим объектам</a>
  </div></div>`;
}
