// Sortable tables (R7.5): passes, antennas (band roles, provenance) and satellites (epoch age per mission).
// Header buttons sort (aria-sort on the th); tabs switch the table and show a row count. Everything is keyboard operable.
// Band, state and epoch cells render as coloured chips.
import { h } from './dom.mjs';
import { badge } from './badge.mjs';
import { sortRows, nextSort, passTable, antennaTable, satelliteTable } from './tables-model.mjs';
import { MISSIONS } from '../data/missions.mjs';

const REFRESH_MS = 1000;
const PHASE_TONE = { scheduled: 'idle', 'pre-position': 'info', downlink: 'live', los: 'warn', delivered: 'ok' };
const EPOCH_TONE = { fresh: 'ok', aging: 'warn', stale: 'bad' };

/** Cell content for a column: a chip for band, state and epoch columns, a provenance badge, or plain text. */
function cellContent(c, value) {
  if (c.badge) return badge(value);
  if (c.chip === 'band') return h('span', { class: 'bd', 'data-band': value, text: String(value) });
  if (c.chip === 'band-list') return h('span', { style: 'display:inline-flex;gap:3px' }, ...String(value).split(', ').filter(Boolean).map((b) => h('span', { class: 'bd', 'data-band': b, text: b })));
  if (c.chip === 'phase') return h('span', { class: 'chip', 'data-tone': PHASE_TONE[value] ?? 'idle', text: String(value) });
  if (c.chip === 'epoch') return h('span', { class: 'chip', 'data-tone': EPOCH_TONE[value] ?? 'idle', text: String(value) });
  return document.createTextNode(String(value ?? '--'));
}

export function createTables({ dashboard, orbitSource, station }) {
  const TABS = [
    { id: 'passes', label: 'Passes', build: ({ schedule, simMs }) => passTable(schedule, simMs) },
    { id: 'antennas', label: 'Antennas', build: () => antennaTable(station) },
    {
      id: 'satellites', label: 'Satellites',
      build: ({ schedule, simMs }) => satelliteTable({
        missions: MISSIONS, records: orbitSource.current().records, nowDate: new Date(simMs),
        states: new Map(schedule.satellites.map((s) => [s.norad, { elDeg: s.elDeg }])),
      }),
    },
  ];
  const sorts = { passes: { key: 'aos', dir: 'asc' }, antennas: { key: 'id', dir: 'asc' }, satellites: { key: 'name', dir: 'asc' } };
  let active = 'passes', acc = REFRESH_MS, last = null, follow = true, lastFrame = null;

  const tabs = h('div', { class: 'tabs', role: 'group', 'aria-label': 'Table' });
  const tabButtons = new Map(), tabCounts = new Map();
  for (const t of TABS) {
    const count = h('b', { class: 'num', text: '0' });
    const b = h('button', { type: 'button', 'aria-pressed': String(t.id === active) }, h('span', { text: t.label }), count);
    b.addEventListener('click', () => { active = t.id; follow = true; for (const [id, el] of tabButtons) el.setAttribute('aria-pressed', String(id === active)); if (lastFrame) render(lastFrame); });
    tabButtons.set(t.id, b); tabCounts.set(t.id, count); tabs.append(b);
  }
  tabs.append(h('span', { class: 'tab-note', text: 'Click a column header to sort.' }));
  const table = h('table', { class: 'data' });
  const scroll = h('div', { class: 'table-scroll', tabindex: '0', role: 'region', 'aria-label': 'Table contents' }, table);
  for (const ev of ['wheel', 'touchmove', 'keydown', 'pointerdown']) scroll.addEventListener(ev, () => { follow = false; }, { passive: true });
  dashboard.mount('tables', '', h('div', { style: 'display:flex;flex-direction:column;min-height:0;flex:1 1 auto' }, tabs, scroll), { order: 50 });
  document.getElementById('panel-tables')?.classList.add('tables-panel');

  function render(frame) {
    lastFrame = frame;
    const models = new Map(TABS.map((t) => [t.id, t.build(frame)]));
    for (const [id, m] of models) tabCounts.get(id).textContent = String(m.rows.length);
    const tab = TABS.find((t) => t.id === active);
    const model = models.get(active);
    last = { tab, model };
    const sort = sorts[active];
    const head = h('tr');
    for (const c of model.columns) {
      const th = h('th', { scope: 'col', 'data-col': c.key, 'aria-sort': sort.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none' });
      const btn = h('button', { type: 'button', text: c.label });
      btn.addEventListener('click', () => { sorts[active] = nextSort(sorts[active], c.key); follow = true; render(frame); });
      th.append(btn); head.append(th);
    }
    const body = h('tbody');
    let firstLive = null;
    for (const row of sortRows(model.rows, sort.key, sort.dir)) {
      const tr = h('tr');
      if (row.phase) tr.dataset.phase = row.phase;
      for (const c of model.columns) {
        const td = h('td', { class: `${c.numeric ? 'num' : ''}${c.strong ? ' strong' : ''}`.trim() || null, 'data-col': c.key });
        td.append(cellContent(c, row[c.field ?? c.key]));
        tr.append(td);
      }
      if (row.norad != null && active !== 'antennas') {
        tr.tabIndex = 0; tr.classList.add('pickable');
        const pick = () => dashboard.select({ kind: 'satellite', id: `sat-${row.norad}`, label: row.name, provenance: row.provenance });
        tr.addEventListener('click', pick);
        tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') pick(); });
      }
      if (!firstLive && active === 'passes' && sort.key === 'aos' && sort.dir === 'asc' && row.phase !== 'delivered') firstLive = tr;
      body.append(tr);
    }
    table.replaceChildren(head, body);
    // Keep the pass in flight at the top of the view until the reader scrolls: finished passes sit above it.
    if (follow && firstLive) scroll.scrollTop = Math.max(0, firstLive.offsetTop - head.offsetHeight - 2);
    else if (follow) scroll.scrollTop = 0;
  }

  return {
    update(frame) {
      acc += Math.max(0, frame.dt) * 1000;
      if (acc < REFRESH_MS) return;
      acc = 0;
      render(frame);
    },
    get lastModel() { return last; },
  };
}
