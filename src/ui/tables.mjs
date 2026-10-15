// Sortable tables (R7.5): passes, antennas (band roles, provenance) and satellites (epoch age per mission).
// Header buttons sort (aria-sort on the th); tabs switch the table. Everything is keyboard operable.
import { h } from './dom.mjs';
import { badge } from './badge.mjs';
import { sortRows, nextSort, passTable, antennaTable, satelliteTable } from './tables-model.mjs';
import { MISSIONS } from '../data/missions.mjs';

const REFRESH_MS = 1000;

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
  let active = 'passes', acc = REFRESH_MS, last = null;

  const tabs = h('div', { class: 'tabs', role: 'group', 'aria-label': 'Table' });
  const tabButtons = new Map();
  for (const t of TABS) {
    const b = h('button', { type: 'button', text: t.label, 'aria-pressed': String(t.id === active) });
    b.addEventListener('click', () => { active = t.id; for (const [id, el] of tabButtons) el.setAttribute('aria-pressed', String(id === active)); acc = REFRESH_MS; });
    tabButtons.set(t.id, b); tabs.append(b);
  }
  const table = h('table', { class: 'data' });
  const scroll = h('div', { class: 'table-scroll', tabindex: '0', role: 'region', 'aria-label': 'Table contents' }, table);
  const legend = h('p', { class: 'note muted', text: 'Click a column header to sort.' });
  dashboard.mount('tables', 'Tables', h('div', {}, tabs, scroll, legend), { order: 50 });

  function render(frame) {
    const tab = TABS.find((t) => t.id === active);
    const model = tab.build(frame);
    last = { tab, model };
    const sort = sorts[active];
    const head = h('tr');
    for (const c of model.columns) {
      const th = h('th', { scope: 'col', 'aria-sort': sort.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none' });
      const btn = h('button', { type: 'button', text: c.label });
      btn.addEventListener('click', () => { sorts[active] = nextSort(sorts[active], c.key); render(frame); });
      th.append(btn); head.append(th);
    }
    const body = h('tbody');
    for (const row of sortRows(model.rows, sort.key, sort.dir)) {
      const tr = h('tr');
      for (const c of model.columns) {
        const td = h('td', c.numeric ? { class: 'num' } : {});
        if (c.badge) td.append(badge(row[c.key])); else td.textContent = String(row[c.field ?? c.key] ?? '--');
        tr.append(td);
      }
      if (row.norad != null && active !== 'antennas') {
        tr.tabIndex = 0; tr.className = 'pickable';
        const pick = () => dashboard.select({ kind: 'satellite', id: `sat-${row.norad}`, label: row.name, provenance: row.provenance });
        tr.addEventListener('click', pick);
        tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') pick(); });
      }
      body.append(tr);
    }
    table.replaceChildren(head, body);
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
