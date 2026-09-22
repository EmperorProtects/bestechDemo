/**
 * Данные демо-кабинета: организация, объекты, разделы ПД, листы, замечания,
 * исходные данные и лента событий. Те же записи, что в засеве боевого портала,
 * только здесь они лежат в памяти браузера.
 */

export const ORG = { name: 'ТОО «Акмола Агро»', bin: 'БИН 060740002135' };

export const USERS = [
  { id: 'usr-bekzhanov', name: 'Бекжанов Т.', initials: 'ТБ', role: 'customer', roleLabel: 'Заказчик', position: 'Директор по строительству' },
  { id: 'usr-sagintaev', name: 'Сагинтаев Е.', initials: 'ЕС', role: 'engineer', roleLabel: 'ГИП', position: 'Главный инженер проекта' },
  { id: 'usr-kim', name: 'Ким А.', initials: 'АК', role: 'supervisor', roleLabel: 'Технадзор', position: 'Технический надзор' },
];

export const STAGE_LABELS = { design: 'Проектирование', construction: 'Строительство', operation: 'Эксплуатация' };
export const STAGE_COLOR = { design: 'var(--bst-accent-ink)', construction: 'var(--bst-warn)', operation: 'var(--bst-ok)' };

export const DOC_STATUS = {
  issued: { label: 'Выдано', glyph: '●', color: 'var(--bst-ok)' },
  review: { label: 'На проверке', glyph: '●', color: 'var(--bst-accent-ink)' },
  remarks: { label: 'Замечания', glyph: '▲', color: 'var(--bst-warn)' },
  progress: { label: 'В работе', glyph: '○', color: 'var(--bst-text-mute)' },
  void: { label: 'Аннулировано', glyph: '✕', color: 'var(--bst-offline)' },
};

export const INPUT_STATE = {
  accepted: { label: 'Принято', glyph: '●', color: 'var(--bst-ok)' },
  review: { label: 'На проверке', glyph: '●', color: 'var(--bst-accent-ink)' },
  requested: { label: 'Запрошено', glyph: '○', color: 'var(--bst-text-mute)' },
  missing: { label: 'Нет документа', glyph: '▲', color: 'var(--bst-alarm)' },
};

export const ASSETS = [
  {
    code: '2026-014',
    name: 'Молочный комплекс, 1 200 голов',
    shortName: 'Молочный комплекс',
    region: 'Акмолинская обл.',
    address: 'Акмолинская обл., Целиноградский р-н',
    stage: 'construction',
    chief: 'Бекжанов Т.',
    area: '4 820 м²',
    capacity: '1 200 голов',
    contract: '№ 14/26 от 05.02.2026',
    updated: '11.09.2026 09:42',
    progress: 62,
    plannedProgress: 58,
    figure: 'barn',
    sectionsLabel: '9 из 9 выдано',
    deadline: { date: '25.09.2026', note: 'Акт скрытых работ, КЖ монолит' },
    remarks: { count: 3, label: '3 открытых', note: 'АР-05, АР-07, КМ-02', state: 'warning' },
    sensors: { online: 47, total: 48, note: 'ЭОМ-ТП — нет связи 4 ч', state: 'ok' },
    hasTwin: true,
    map: { x: 0.42, y: 0.26 },
  },
  {
    code: '2026-021',
    name: 'Водозаборное сооружение, Q = 5 000 м³/сут',
    shortName: 'Водозабор',
    region: 'Карагандинская обл.',
    address: 'Карагандинская обл., Бухар-Жырауский р-н',
    stage: 'design',
    chief: 'Оспанова Д.',
    area: '1 140 м²',
    capacity: 'Q = 5 000 м³/сут',
    contract: '№ 21/26 от 04.06.2026',
    updated: '10.09.2026 16:20',
    progress: 34,
    plannedProgress: 40,
    figure: 'intake',
    sectionsLabel: '4 из 9 выдано',
    deadline: { date: '30.09.2026', note: 'Выдача раздела ВК, версия 3' },
    remarks: { count: 1, label: '1 на проверке', note: 'ВК на нормоконтроле', state: 'ok' },
    sensors: { online: 0, total: 0, note: 'Двойник после старта СМР', state: 'offline' },
    hasTwin: false,
    map: { x: 0.57, y: 0.36 },
  },
  {
    code: '2025-097',
    name: 'Кормоцех, 20 т/ч',
    shortName: 'Кормоцех',
    region: 'Акмолинская обл.',
    address: 'Акмолинская обл., Шортандинский р-н',
    stage: 'operation',
    chief: 'Сагинтаев Е.',
    area: '2 260 м²',
    capacity: '20 т/ч',
    contract: '№ 97/25 от 12.03.2025',
    updated: '11.09.2026 06:05',
    progress: 100,
    plannedProgress: 100,
    figure: 'mill',
    sectionsLabel: 'комплект в архиве',
    deadline: { date: '17.09.2026', note: 'ТО-04, ревизия насосной' },
    remarks: { count: 0, label: 'нет', note: 'Замечания закрыты 22.05.2026', state: 'ok' },
    sensors: { online: 22, total: 22, note: 'Учёт ресурсов ведётся', state: 'ok' },
    hasTwin: true,
    map: { x: 0.5, y: 0.82 },
  },
];

export const METRICS = {
  '2026-014': { deviations: { total: 7, alarm: 1, warning: 6, parameters: 214 }, remarksOpen: { count: 3, sheets: 'АР-05 · АР-07 · КМ-02', due: 'срок ответа 15.09.2026' } },
  '2026-021': { deviations: { total: 0, alarm: 0, warning: 0, parameters: 96 }, remarksOpen: { count: 1, sheets: 'ВК-03', due: 'на нормоконтроле' } },
  '2025-097': { deviations: { total: 2, alarm: 0, warning: 2, parameters: 148 }, remarksOpen: { count: 0, sheets: '—', due: 'все закрыты' } },
};

export const EVENTS = {
  '2026-014': [
    { date: '11.09.2026 09:18', severity: 'alarm', title: 'Авария: нагрузка на ферму Ф-2 — 86 % от проектной', meta: 'Раздел КМ · порог 80 % · ответственный технадзор Ким А. · SLA 4 ч', action: 'Открыть в двойнике', href: '#/twin/2026-014' },
    { date: '09.09.2026 17:40', severity: 'warning', title: 'Осадка марки ГМ-07 — 12 мм при допуске 15 мм', meta: 'Раздел КЖ · нивелирование, тренд +1,4 мм/нед · геодезист Оспанов Р.', action: 'Телеметрия', href: '#/twin/2026-014/telemetry' },
    { date: '05.09.2026 11:05', severity: 'warning', title: 'Замечание по листу АР-05: не указана отметка чистого пола', meta: 'ГОСТ 21.501, п. 5.3 · автор раздела Ким А. · срок ответа 15.09.2026', action: 'Открыть лист', href: '#/asset/2026-014/documents/АР-05' },
    { date: '01.09.2026 14:22', severity: 'ok', title: 'Раздел ГП выдан, версия 3 — подписан ГИП', meta: 'Генеральный план · Сагинтаев Е. · ЭЦП НУЦ РК' },
    { date: '28.08.2026 08:50', severity: 'info', title: 'Съёмка БПЛА, 2-й облёт: облако точек сопоставлено с моделью', meta: 'Отклонений вне допуска не выявлено · 4,2 млн точек' },
    { date: '20.08.2026 10:14', severity: 'ok', title: 'Акт скрытых работ по фундаментам подписан', meta: 'Исполнительная документация · технадзор Ким А.' },
  ],
  '2026-021': [
    { date: '10.09.2026 16:20', severity: 'info', title: 'Раздел ВК передан на нормоконтроль, версия 2', meta: 'Оспанова Д. · проверка по СП РК 4.01-101-2012' },
    { date: '02.09.2026 12:00', severity: 'ok', title: 'Приняты технические условия на водоснабжение', meta: 'ТУ № 411-26 · срок действия до 01.09.2028' },
  ],
  '2025-097': [
    { date: '11.09.2026 06:05', severity: 'ok', title: 'Суточный отчёт по потреблению ресурсов сформирован', meta: 'Вода 1 840 м³ · электро 26 400 кВт·ч · тепло 74 Гкал' },
    { date: '08.09.2026 09:30', severity: 'warning', title: 'Дефект ДЕФ-11: течь задвижки в узле У2', meta: 'Журнал дефектов · просрочено 2 дня · служба эксплуатации' },
  ],
};

export const INPUTS = {
  '2026-014': [
    { code: 'ЗАД', title: 'Задание на проектирование', file: 'Задание_2026.pdf', date: '05.02.2026', state: 'accepted' },
    { code: 'ТУ', title: 'ТУ на водоснабжение и канализацию', file: 'ТУ_ВК.pdf', date: '12.02.2026', state: 'accepted' },
    { code: 'ТХ', title: 'Технологическое задание', file: 'ТХ_задание.docx', date: '14.02.2026', state: 'accepted' },
    { code: 'ТОПО', title: 'Топографическая съёмка участка', file: 'topo_2026.dwg', date: '20.02.2026', state: 'review' },
    { code: 'АПЗ', title: 'Архитектурно-планировочное задание', file: null, date: null, state: 'missing' },
    { code: 'ИГИ', title: 'Инженерно-геологические изыскания', file: null, date: null, state: 'missing' },
    { code: 'ТУ-Э', title: 'ТУ на электроснабжение', file: null, date: null, state: 'requested' },
  ],
  '2026-021': [
    { code: 'ЗАД', title: 'Задание на проектирование', file: 'Задание_водозабор.pdf', date: '04.06.2026', state: 'accepted' },
    { code: 'ТУ', title: 'ТУ на водоснабжение', file: 'ТУ_411-26.pdf', date: '02.09.2026', state: 'accepted' },
    { code: 'ИГИ', title: 'Инженерно-геологические изыскания', file: 'igi_2026.pdf', date: '18.06.2026', state: 'review' },
    { code: 'АПЗ', title: 'Архитектурно-планировочное задание', file: null, date: null, state: 'missing' },
  ],
  '2025-097': [
    { code: 'ЗАД', title: 'Задание на проектирование', file: 'Задание_кормоцех.pdf', date: '12.03.2025', state: 'accepted' },
    { code: 'ТУ', title: 'ТУ на электроснабжение', file: 'ТУ_Э_209-25.pdf', date: '28.03.2025', state: 'accepted' },
  ],
};

export const COMPLETENESS = {
  '2026-014': {
    percent: 68,
    missing: [
      { severity: 'alarm', title: 'Архитектурно-планировочное задание (АПЗ)', note: 'без АПЗ нельзя выпустить ГП и АР' },
      { severity: 'warning', title: 'Инженерно-геологические изыскания', note: 'нужны для КЖ: расчёт фундаментов' },
      { severity: 'warning', title: 'ТУ на электроснабжение', note: 'есть только ТУ на водоснабжение' },
    ],
  },
  '2026-021': { percent: 74, missing: [{ severity: 'warning', title: 'Архитектурно-планировочное задание (АПЗ)', note: 'требуется для согласования ГП' }] },
  '2025-097': { percent: 100, missing: [] },
};

export const SECTIONS = {
  '2026-014': [
    { code: 'ГП', name: 'Генеральный план и транспорт', sheets: 8, version: 3, author: 'Сагинтаев Е.', status: 'issued', remarks: 0, issued: '04.08.2026' },
    { code: 'ТХ', name: 'Технологические решения', sheets: 14, version: 2, author: 'Сагинтаев Е.', status: 'issued', remarks: 0, issued: '11.08.2026' },
    { code: 'АР', name: 'Архитектурные решения', sheets: 12, version: 5, author: 'Ким А.', status: 'remarks', remarks: 2, issued: null },
    { code: 'КМ', name: 'Конструкции металлические', sheets: 22, version: 4, author: 'Бекжанов Т.', status: 'remarks', remarks: 1, issued: null },
    { code: 'КЖ', name: 'Конструкции железобетонные', sheets: 26, version: 4, author: 'Бекжанов Т.', status: 'issued', remarks: 0, issued: '18.08.2026' },
    { code: 'ОВ', name: 'Отопление, вентиляция, кондиционирование', sheets: 16, version: 1, author: 'Ахметова Г.', status: 'progress', remarks: 0, issued: null },
    { code: 'ВК', name: 'Водоснабжение и канализация', sheets: 11, version: 2, author: 'Оспанова Д.', status: 'review', remarks: 0, issued: null },
    { code: 'ЭОМ', name: 'Электроснабжение и электрооборудование', sheets: 9, version: 2, author: 'Тлеуов С.', status: 'review', remarks: 0, issued: null },
    { code: 'СС', name: 'Слаботочные системы и связь', sheets: 6, version: 1, author: 'Тлеуов С.', status: 'issued', remarks: 0, issued: '25.08.2026' },
  ],
  '2026-021': [
    { code: 'ГП', name: 'Генеральный план и транспорт', sheets: 6, version: 1, author: 'Сагинтаев Е.', status: 'review', remarks: 0, issued: null },
    { code: 'ТХ', name: 'Технологические решения', sheets: 9, version: 1, author: 'Сагинтаев Е.', status: 'progress', remarks: 0, issued: null },
    { code: 'АР', name: 'Архитектурные решения', sheets: 8, version: 2, author: 'Ким А.', status: 'review', remarks: 0, issued: null },
    { code: 'КЖ', name: 'Конструкции железобетонные', sheets: 12, version: 1, author: 'Бекжанов Т.', status: 'progress', remarks: 0, issued: null },
    { code: 'ВК', name: 'Водоснабжение и канализация', sheets: 7, version: 1, author: 'Оспанова Д.', status: 'progress', remarks: 0, issued: null },
  ],
  '2025-097': [
    { code: 'ГП', name: 'Генеральный план и транспорт', sheets: 7, version: 4, author: 'Сагинтаев Е.', status: 'issued', remarks: 0, issued: '12.03.2025' },
    { code: 'ТХ', name: 'Технологические решения', sheets: 11, version: 3, author: 'Сагинтаев Е.', status: 'issued', remarks: 0, issued: '12.03.2025' },
    { code: 'АР', name: 'Архитектурные решения', sheets: 10, version: 6, author: 'Ким А.', status: 'issued', remarks: 0, issued: '28.03.2025' },
    { code: 'КМ', name: 'Конструкции металлические', sheets: 18, version: 5, author: 'Бекжанов Т.', status: 'issued', remarks: 0, issued: '28.03.2025' },
    { code: 'ЭОМ', name: 'Электроснабжение и электрооборудование', sheets: 8, version: 3, author: 'Тлеуов С.', status: 'issued', remarks: 0, issued: '05.04.2025' },
  ],
};

/** Типовые наименования листов по разделам СПДС. */
const SHEET_NAMES = {
  ГП: ['Общие данные, ведомость чертежей', 'Разбивочный план', 'План организации рельефа', 'План земляных масс', 'Сводный план сетей', 'План благоустройства', 'Поперечные профили проездов', 'Ведомость объёмов работ'],
  ТХ: ['Общие данные', 'План расположения оборудования, отм. 0.000', 'План доильного зала', 'Схема технологических потоков', 'Спецификация оборудования', 'Узлы крепления оборудования'],
  АР: ['Общие данные', 'План на отм. 0.000', 'План на отм. +3.600', 'План кровли', 'Разрез 1-1', 'Разрез 2-2', 'Фасад в осях 1–7', 'Фасад в осях А–Г', 'Ведомость отделки помещений', 'Ведомость проёмов', 'Узлы примыканий', 'Экспликация помещений'],
  КМ: ['Общие данные', 'Схема расположения колонн', 'Схема расположения ферм покрытия', 'Ферма Ф-1, деталировка', 'Ферма Ф-2, деталировка', 'Связи по покрытию', 'Узлы У-1…У-6', 'Ведомость металла'],
  КЖ: ['Общие данные', 'План фундаментов', 'Опалубочный план на отм. 0.000', 'Армирование плиты перекрытия', 'Монолитные стены, армирование', 'Спецификация арматуры'],
  ОВ: ['Общие данные', 'План систем вентиляции', 'Схема приточной установки П1', 'Спецификация оборудования'],
  ВК: ['Общие данные', 'План сетей В1 и К1', 'Схема узла ввода У2', 'Спецификация'],
  ЭОМ: ['Общие данные', 'Схема электроснабжения ТП-1', 'План силового электрооборудования', 'План освещения'],
  СС: ['Общие данные', 'Структурированная кабельная сеть', 'План видеонаблюдения'],
};

const SHEET_STATUS = { issued: 'issued', remarks: 'remarks', review: 'review', progress: 'progress', void: 'void' };

/** Листы раздела: номера как в альбоме, часть листов — с открытыми замечаниями. */
export function sheetsOf(assetCode, sectionCode) {
  const section = (SECTIONS[assetCode] ?? []).find((s) => s.code === sectionCode);
  if (!section) return [];
  const names = SHEET_NAMES[sectionCode] ?? ['Общие данные'];
  const count = Math.min(section.sheets, names.length);
  return Array.from({ length: count }, (_, i) => {
    const code = `${sectionCode}-${String(i + 1).padStart(2, '0')}`;
    const remarks = REMARKS[assetCode]?.filter((r) => r.sheet === code) ?? [];
    const status = remarks.some((r) => r.status === 'open') ? SHEET_STATUS.remarks : section.status;
    return {
      code,
      number: String(i + 1).padStart(2, '0'),
      name: names[i],
      section: sectionCode,
      version: section.version,
      author: section.author,
      status,
      remarks: remarks.length,
      format: i === 0 ? 'А3' : 'А1',
      scale: i === 0 ? '—' : '1:100',
      issued: section.issued,
    };
  });
}

/** Замечания нормоконтроля: привязаны к листу и к месту на нём. */
export const REMARKS = {
  '2026-014': [
    {
      sheet: 'АР-05',
      number: 1,
      x: 0.34,
      y: 0.42,
      status: 'open',
      date: '05.09.2026',
      clause: 'ГОСТ 21.501, п. 5.3',
      locus: 'ось Б/2 · доильный зал',
      text: 'Не указана отметка чистого пола. Отметки уровней должны быть показаны на плане и разрезе.',
      thread: [
        { author: 'Сагинтаев Е.', initials: 'ЕС', role: 'нормоконтроль', at: '05.09.2026 11:05', text: 'Лист принят с замечанием. Отметку чистого пола показать на плане и разрезе 1-1. Срок ответа 15.09.2026.' },
        { author: 'Ким А.', initials: 'АК', role: 'автор раздела', at: '08.09.2026 09:12', text: 'Принято в работу, отметка +0.450 будет добавлена в версии 6.' },
      ],
    },
    {
      sheet: 'АР-07',
      number: 2,
      x: 0.62,
      y: 0.55,
      status: 'open',
      date: '05.09.2026',
      clause: 'СП РК 3.02-101-2012, п. 6.14',
      locus: 'ось В/4 · эвакуационный выход',
      text: 'Ширина эвакуационного выхода 0,9 м вместо требуемых 1,2 м.',
      thread: [{ author: 'Сагинтаев Е.', initials: 'ЕС', role: 'нормоконтроль', at: '05.09.2026 11:20', text: 'Выход расширить до 1,2 м либо обосновать расчётом времени эвакуации.' }],
    },
    {
      sheet: 'КМ-02',
      number: 1,
      x: 0.48,
      y: 0.38,
      status: 'open',
      date: '06.09.2026',
      clause: 'ГОСТ 21.502, п. 5.2',
      locus: 'узел У-4',
      text: 'Не указан класс прочности болтов в узле У-4.',
      thread: [{ author: 'Сагинтаев Е.', initials: 'ЕС', role: 'нормоконтроль', at: '06.09.2026 10:30', text: 'В спецификации узла У-4 отсутствует класс прочности болтов. Срок ответа 18.09.2026.' }],
    },
  ],
  '2026-021': [],
  '2025-097': [],
};

export const assetByCode = (code) => ASSETS.find((a) => a.code === code);
