// Glass dashboard shell (R7.1, R7.2, R7.6): a column on the right edge, so the scene centre stays uncovered.
// Header with source/epoch/refresh, KPI panel, and `mount()` slots that other panels (detail, tracker, tables) use.
import { PRODUCT_NAME } from './branding.mjs';
import { h, setText } from './dom.mjs';
import { kpis } from '../core/kpi.mjs';
import { sourceModel, refreshOutcomeText, kpiRows } from './dashboard-model.mjs';

const REFRESH_MS = 250; // the header and KPIs refresh four times a second, not every frame

export function createDashboard({ orbitSource }) {
  const root = h('aside', { id: 'dashboard', 'aria-label': 'Operations dashboard' });

  // Header: product name, source label with epoch age, refresh control.
  const stateChip = h('span', { class: 'source-state' });
  const epochText = h('span', { class: 'num' });
  const ageText = h('span', { class: 'num muted' });
  const warning = h('div', { class: 'source-warning', role: 'status', hidden: true, text: 'Orbit data is older than 7 days; predictions may drift.' });
  const refreshBtn = h('button', { type: 'button', text: 'Refresh orbit data' });
  const refreshNote = h('div', { class: 'muted', 'aria-live': 'polite' });
  const outcomeNote = h('div', { class: 'muted', 'aria-live': 'polite' });
  const header = h('section', { class: 'panel', 'aria-label': 'Source' },
    h('h1', { text: PRODUCT_NAME }),
    h('div', { class: 'row' }, h('span', { class: 'muted', text: 'Orbit source' }), stateChip),
    h('div', { class: 'row' }, h('span', { class: 'muted', text: 'Epoch' }), epochText),
    h('div', { class: 'row' }, h('span', { class: 'muted', text: 'Age' }), ageText),
    warning,
    h('div', { class: 'row' }, refreshBtn), refreshNote, outcomeNote);
  header.style.order = '0';

  // KPI panel.
  const kpiList = h('dl', { class: 'kpis' });
  const kpiCells = new Map();
  const kpiPanel = h('section', { class: 'panel', 'aria-label': 'Key indicators' }, h('h2', { text: 'Operations' }), kpiList);
  kpiPanel.style.order = '10';
  root.append(header, kpiPanel);
  document.body.appendChild(root);

  let selected = null;
  const listeners = new Set();
  let acc = REFRESH_MS, dirty = true;

  refreshBtn.addEventListener('click', async () => {
    refreshBtn.disabled = true;
    setText(outcomeNote, 'Requesting live orbit data...');
    const result = await orbitSource.refresh();
    setText(outcomeNote, refreshOutcomeText(result));
    dirty = true; // the schedule re-keys on the new epochs by itself (R3.7); the header just re-reads the source
  });

  function renderKpis(rows) {
    for (const r of rows) {
      let c = kpiCells.get(r.id);
      if (!c) {
        c = { value: h('dd', { class: 'num' }), sub: h('small') };
        c.value.append(c.sub);
        c.main = document.createTextNode('');
        c.value.prepend(c.main);
        kpiList.append(h('div', { class: 'kpi', 'data-kpi': r.id }, h('dt', { text: r.label }), c.value));
        kpiCells.set(r.id, c);
      }
      if (c.main.data !== r.value) c.main.data = r.value;
      setText(c.sub, r.sub);
    }
  }

  return {
    root,
    /** Add a panel under the KPIs. `order` sorts panels (header 0, KPIs 10). */
    mount(id, title, element, { order = 50 } = {}) {
      const section = h('section', { class: 'panel', id: `panel-${id}`, 'aria-label': title }, title ? h('h2', { text: title }) : '', element);
      section.style.order = String(order);
      root.append(section);
      return section;
    },
    select(entity) { selected = entity; for (const fn of listeners) fn(selected); },
    selected: () => selected,
    onSelect(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    update({ simMs, dt, schedule }) {
      acc += dt * 1000;
      if (acc < REFRESH_MS && !dirty) return;
      acc = 0; dirty = false;
      const served = schedule.assignments.filter((a) => a.status === 'assigned').map((a) => a.pass).concat(schedule.finished.map((f) => f.pass));
      renderKpis(kpiRows(kpis(served, simMs)));

      const m = sourceModel(orbitSource.current(), orbitSource.status(), new Date(simMs), new Date());
      setText(stateChip, `${m.label} (${m.state})`);
      stateChip.dataset.state = m.state;
      setText(epochText, m.epoch);
      setText(ageText, `${m.ageDays.toFixed(2)} d`);
      warning.hidden = !m.warning;
      refreshBtn.disabled = !m.refresh.enabled;
      setText(refreshNote, m.refresh.text);
    },
  };
}
