// Dashboard shell (R7.1, R7.2, R7.6): top bar (brand, search, areas, clock, weather, theme), KPI cards with sparklines,
// a side column and a collapsible bottom dock. `mount()` places the other panels: tracker, globe and tables in the dock,
// everything else in the side column. At 768 px and below the same content becomes the bottom sheet (see sheet.mjs).
import { PRODUCT_NAME } from './branding.mjs';
import { h, svg, setText } from './dom.mjs';
import { icon, logoMark } from './icons.mjs';
import { sourceModel, refreshOutcomeText, kpiCards } from './dashboard-model.mjs';
import { sparkPath } from './spark-model.mjs';
import { approach } from './tween-model.mjs';
import { nextThemeMode, resolveTheme } from './theme-model.mjs';

const REFRESH_MS = 250; // the KPI cards and the source panel refresh four times a second, not every frame
const DOCK_PANELS = new Set(['tracker', 'globe', 'tables']);
const MOBILE = '(max-width: 768px)';
const THEME_KEY = 'alisio-theme';
const SPARK_W = 100, SPARK_H = 26;

const readMode = () => { try { const m = localStorage.getItem(THEME_KEY); return ['auto', 'light', 'dark'].includes(m) ? m : 'auto'; } catch { return 'auto'; } };
const saveMode = (m) => { try { localStorage.setItem(THEME_KEY, m); } catch { /* private mode: the choice just lasts for the session */ } };

function sparkline() {
  const line = svg('path', { class: 'line' }), area = svg('path', { class: 'area' }), now = svg('line', { class: 'now', y1: 0, y2: SPARK_H });
  const el = svg('svg', { class: 'spark', viewBox: `0 0 ${SPARK_W} ${SPARK_H}`, preserveAspectRatio: 'none', 'aria-hidden': 'true', focusable: 'false' }, area, line, now);
  return {
    el,
    set(values, markAt) {
      const d = sparkPath(values, SPARK_W, SPARK_H, 2);
      line.setAttribute('d', d);
      area.setAttribute('d', d ? `${d} L${SPARK_W - 2} ${SPARK_H} L2 ${SPARK_H} Z` : '');
      now.style.display = markAt == null ? 'none' : '';
      if (markAt != null) { const x = 2 + markAt * (SPARK_W - 4); now.setAttribute('x1', x); now.setAttribute('x2', x); }
    },
  };
}

/** One KPI card: label, tweened number or text, sub line, then a sparkline, a delta or a bar depending on the KPI. */
function createKpiCard(id, label) {
  const val = h('b', { class: 'num' }), unit = h('small'), sub = h('div', { class: 'k-sub' });
  const el = h('article', { class: 'kpi glass', 'data-kpi': id, 'aria-label': label },
    h('div', { class: 'k-label' }, h('i'), h('p', { class: 'eyebrow', text: label })), h('div', { class: 'k-val' }, val, unit), sub);
  const card = { el, display: 0, target: null };
  if (['today', 'active', 'volume'].includes(id)) { card.spark = sparkline(); }
  if (id === 'volume') { card.delta = h('div', { class: 'k-delta num' }); el.append(card.delta); }
  if (card.spark) el.append(card.spark.el);
  if (id === 'countdown' || id === 'timeliness') {
    card.on = h('i', { class: 'on' }); card.risk = h('i', { class: 'risk' }); card.late = h('i', { class: 'late' });
    el.append(h('div', { class: 'bar', 'aria-hidden': 'true' }, card.on, card.risk, card.late));
  }
  if (id === 'timeliness') {
    card.legend = [h('span'), h('span'), h('span')];
    el.append(h('div', { class: 'legend3' }, ...card.legend));
  }
  card.render = (c) => {
    setText(sub, c.sub ?? '');
    if (c.num != null) { card.target = c.num; setText(unit, c.unit ?? ''); } else card.target = null;
    if (c.text != null) setText(val, c.text);
    if (c.spark) card.spark.set(c.spark, c.markAt);
    if (c.delta) { setText(card.delta, c.delta.text); card.delta.dataset.tone = c.delta.tone; }
    if (id === 'countdown') { card.on.style.width = `${Math.round(c.progress * 100)}%`; card.risk.style.width = '0'; card.late.style.width = '0'; }
    if (id === 'timeliness') {
      const n = c.finished || 1;
      setText(val, c.finished === 0 ? '--' : String(c.onTime));
      setText(unit, c.finished === 0 ? '' : `/ ${c.finished} on time`);
      card.on.style.width = `${(c.onTime / n) * 100}%`; card.risk.style.width = `${(c.atRisk / n) * 100}%`; card.late.style.width = `${(c.late / n) * 100}%`;
      setText(card.legend[0], `${c.onTime} on time`); setText(card.legend[1], `${c.atRisk} at risk`); setText(card.legend[2], `${c.late} late`);
    }
  };
  card.tween = (dt) => {
    if (card.target == null) return;
    card.display = approach(card.display, card.target, dt);
    setText(val, String(Math.round(card.display)));
  };
  return card;
}

export function createDashboard({ orbitSource }) {
  const root = h('aside', { id: 'dashboard', 'aria-label': 'Operations dashboard' });
  const doc = document.documentElement;

  // Top bar. Search, area tabs, clock chip and (on desktop) the time control are created by their own modules and adopted here.
  const chipHost = h('span', { style: 'display:contents' });
  const slotEnd = h('div', { class: 'slot-end' }, chipHost);
  const themeBtn = h('button', { type: 'button', class: 'theme-btn' });
  const themeIcon = h('span', { style: 'display:contents' });
  const themeLabel = h('span');
  themeBtn.append(themeIcon, themeLabel);
  const topbar = h('header', { id: 'topbar', class: 'glass', 'aria-label': 'Top bar' },
    h('div', { class: 'brand' }, logoMark(), h('h1', { 'aria-label': PRODUCT_NAME }, 'Alisio', h('small', { text: 'Maspalomas Ground Station Watch' }))),
    h('div', { class: 'spacer' }), slotEnd);
  const spacer = topbar.children[1];
  for (const id of ['search-hud', 'area-switcher']) { const el = document.getElementById(id); if (el) topbar.insertBefore(el, spacer); }
  const clockEl = document.getElementById('clock-chip');
  if (clockEl) slotEnd.append(clockEl);
  slotEnd.append(themeBtn);

  // Theme: follows the simulated sun until the user picks one (auto -> light -> dark).
  let mode = readMode(), theme = doc.dataset.theme === 'light' ? 'light' : 'dark';
  function paintTheme() {
    doc.dataset.theme = theme;
    themeIcon.replaceChildren(icon(mode === 'auto' ? 'auto' : mode === 'light' ? 'sun' : 'moon'));
    setText(themeLabel, mode === 'auto' ? `Auto ${theme === 'dark' ? 'night' : 'day'}` : mode);
    const msg = `Theme: ${mode === 'auto' ? `auto, follows the simulated sun (${theme})` : mode}. Activate to switch to ${nextThemeMode(mode)}.`;
    themeBtn.setAttribute('aria-label', msg); themeBtn.title = msg;
  }
  themeBtn.addEventListener('click', () => { mode = nextThemeMode(mode); saveMode(mode); if (mode !== 'auto') theme = mode; paintTheme(); sunEl = null; });
  let sunEl = null;
  paintTheme();

  // KPI cards.
  const kpiRow = h('section', { id: 'kpis', 'aria-label': 'Key indicators' });
  const cards = new Map();
  for (const [id, label] of [['today', 'Passes today (UTC)'], ['countdown', 'Next AOS in'], ['active', 'Active passes'], ['volume', 'Data, last 24 h'], ['timeliness', 'Timeliness (NRT)']]) {
    const c = createKpiCard(id, label); cards.set(id, c); kpiRow.append(c.el);
  }

  // Side column and dock.
  const side = h('div', { id: 'side', 'aria-label': 'Details' });
  const dockTools = h('div', { class: 'dock-tools' });
  const collapse = h('button', { type: 'button', class: 'collapse', 'aria-expanded': 'true', 'aria-controls': 'dock-body', 'aria-label': 'Collapse the dock', title: 'Collapse the dock' }, icon('chevron'));
  dockTools.append(collapse);
  const dockBody = h('div', { class: 'dock-body', id: 'dock-body' });
  const dock = h('section', { id: 'dock', class: 'glass', 'aria-label': 'Passes, constellation and tables' },
    h('div', { class: 'dock-head' }, h('h2', { text: 'Live operations' }), dockTools), dockBody);
  collapse.addEventListener('click', () => {
    const closed = dock.toggleAttribute('data-collapsed');
    collapse.setAttribute('aria-expanded', String(!closed));
    const t = closed ? 'Expand the dock' : 'Collapse the dock';
    collapse.setAttribute('aria-label', t); collapse.title = t;
  });
  root.append(kpiRow, dock, side);

  // Source panel (provenance of the orbit data) lives at the end of the side column.
  const stateChip = h('span', { class: 'chip' });
  const epochText = h('span', { class: 'num' });
  const ageText = h('span', { class: 'num' });
  const warning = h('div', { class: 'source-warning', role: 'status', hidden: true, text: 'Orbit data is older than 7 days; predictions may drift.' });
  const refreshBtn = h('button', { type: 'button', class: 's-btn', text: 'Refresh orbit data' });
  const refreshNote = h('p', { class: 's-note', 'aria-live': 'polite' });
  const outcomeNote = h('p', { class: 's-note', 'aria-live': 'polite' });
  const sourcePanel = h('section', { class: 'panel glass source', id: 'panel-source', 'aria-label': 'Orbit source' },
    h('h2', { text: 'Orbit source' }),
    h('div', { class: 's-row' }, h('span', { text: 'State' }), stateChip),
    h('div', { class: 's-row' }, h('span', { text: 'Epoch' }), epochText),
    h('div', { class: 's-row' }, h('span', { text: 'Age' }), ageText),
    warning, refreshBtn, refreshNote, outcomeNote);
  sourcePanel.style.order = '70';
  side.append(sourcePanel);
  document.body.append(topbar, root);

  // The time control is adopted into the dock on desktop and floats above the sheet on mobile.
  const timeEl = document.getElementById('time-control');
  const mq = window.matchMedia?.(MOBILE);
  const placeTime = () => { if (!timeEl) return; if (mq?.matches) document.body.append(timeEl); else dockTools.insertBefore(timeEl, collapse); };
  placeTime();
  mq?.addEventListener?.('change', placeTime);
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => doc.style.setProperty('--dock-h', mq?.matches ? '0px' : `${dock.offsetHeight}px`)).observe(dock);

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

  return {
    root,
    /** Add a panel. tracker, globe and tables go to the dock; the rest to the side column. `order` sorts within each. */
    mount(id, title, element, { order = 50 } = {}) {
      const inDock = DOCK_PANELS.has(id);
      const section = h('section', { class: inDock ? `dock-panel ${id}-panel` : 'panel glass', id: `panel-${id}`, 'aria-label': title || id },
        title ? h('h2', { text: title }) : '', element);
      section.style.order = String(order);
      (inDock ? dockBody : side).append(section);
      return section;
    },
    /** Put a small element (a chip) in the top bar, before the clock. */
    addChip(element) { chipHost.append(element); return element; },
    select(entity) { selected = entity; for (const fn of listeners) fn(selected); },
    selected: () => selected,
    onSelect(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    theme: () => theme,
    update({ simMs, dt, schedule, sun }) {
      for (const c of cards.values()) c.tween(Math.max(0, dt));
      if (sun && typeof sun.elDeg === 'number') {
        sunEl = sun.elDeg;
        const next = resolveTheme(mode, sunEl, theme);
        if (next !== theme) { theme = next; paintTheme(); }
      }
      acc += Math.max(0, dt) * 1000;
      if (acc < REFRESH_MS && !dirty) return;
      acc = 0; dirty = false;
      const served = schedule.assignments.filter((a) => a.status === 'assigned').map((a) => a.pass).concat(schedule.finished.map((f) => f.pass));
      for (const c of kpiCards(served, simMs)) cards.get(c.id).render(c);
    
      const m = sourceModel(orbitSource.current(), orbitSource.status(), new Date(simMs), new Date());
      setText(stateChip, `${m.label} (${m.state})`);
      stateChip.dataset.tone = m.state === 'stale' ? 'bad' : m.state === 'aging' ? 'warn' : 'ok';
      setText(epochText, m.epoch);
      setText(ageText, `${m.ageDays.toFixed(2)} d`);
      warning.hidden = !m.warning;
      refreshBtn.disabled = !m.refresh.enabled;
      setText(refreshNote, m.refresh.text);
    },
  };
}
