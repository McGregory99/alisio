// Dashboard shell (R7.1, R7.2, R7.6) with progressive disclosure. The default scene shows only a slim top bar, three KPI
// chips, one floating pass card and the time control; everything else lives in drawers opened from a tab bar or the menu
// (drawers.mjs), and the detail panel appears while something is selected. `mount()` routes each panel to its home
// (drawer-model.mjs). Keys: P K W I toggle the drawers, H hides the whole interface, Escape closes the top layer.
import { PRODUCT_NAME } from './branding.mjs';
import { h, svg, setText } from './dom.mjs';
import { icon, logoMark } from './icons.mjs';
import { sourceModel, refreshOutcomeText, kpiCards, kpiChips } from './dashboard-model.mjs';
import { createDrawers } from './drawers.mjs';
import { createPassCard } from './pass-card.mjs';
import { DRAWERS, panelHome, keyAction, escapeTarget } from './drawer-model.mjs';
import { sparkPath } from './spark-model.mjs';
import { approach } from './tween-model.mjs';
import { nextThemeMode, resolveTheme } from './theme-model.mjs';

const REFRESH_MS = 250; // the KPI cards and the source panel refresh four times a second, not every frame
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
  const mq = window.matchMedia?.(MOBILE);

  // Top bar: brand, search (adopted), clock chip (adopted), theme and menu buttons.
  const themeBtn = h('button', { type: 'button', class: 'theme-btn' });
  const themeIcon = h('span', { style: 'display:contents' });
  themeBtn.append(themeIcon);
  const menuBtn = h('button', { type: 'button', class: 'menu-btn', 'aria-expanded': 'false', 'aria-controls': 'menu', 'aria-label': 'Menu', title: 'Menu (?)' }, icon('menu'));
  const slotEnd = h('div', { class: 'slot-end' });
  const menu = h('div', { id: 'menu', class: 'menu', hidden: true, role: 'group', 'aria-label': 'Menu', tabindex: '-1' });
  const topbar = h('header', { id: 'topbar', class: 'glass', 'data-hud': '', 'aria-label': 'Top bar' },
    h('div', { class: 'brand' }, logoMark(), h('h1', { 'aria-label': PRODUCT_NAME }, 'Alisio', h('small', { text: 'Maspalomas Ground Station Watch' }))),
    h('div', { class: 'spacer' }), slotEnd, menu);
  const spacer = topbar.children[1];
  const searchEl = document.getElementById('search-hud');
  if (searchEl) topbar.insertBefore(searchEl, spacer);
  const clockEl = document.getElementById('clock-chip');
  if (clockEl) slotEnd.append(clockEl);
  slotEnd.append(themeBtn, menuBtn);

  // Theme: follows the simulated sun until the user picks one (auto -> light -> dark).
  let mode = readMode(), theme = doc.dataset.theme === 'light' ? 'light' : 'dark';
  function paintTheme() {
    doc.dataset.theme = theme;
    themeIcon.replaceChildren(icon(mode === 'auto' ? 'auto' : mode === 'light' ? 'sun' : 'moon'));
    const msg = `Theme: ${mode === 'auto' ? `auto, follows the simulated sun (${theme})` : mode}. Activate to switch to ${nextThemeMode(mode)}.`;
    themeBtn.setAttribute('aria-label', msg); themeBtn.title = msg;
  }
  themeBtn.addEventListener('click', () => { mode = nextThemeMode(mode); saveMode(mode); if (mode !== 'auto') theme = mode; paintTheme(); sunEl = null; });
  let sunEl = null;
  paintTheme();

  // Drawers and the left column (KPI chips, pass card, detail panel).
  const drawers = createDrawers({ onChange: () => syncMenu() });
  const chipEls = new Map(), chipVals = new Map();
  const chipRow = h('section', { id: 'kpi-chips', 'aria-label': 'Key indicators' });
  for (const id of ['countdown', 'active', 'today']) {
    const v = h('b', { class: 'num' }), l = h('span', { class: 'eyebrow' });
    const b = h('button', { type: 'button', class: 'kchip glass', 'data-hud': '', 'data-kpi': id, title: 'Open the key indicators (K)' }, l, v);
    b.addEventListener('click', () => drawers.toggle('kpis'));
    chipEls.set(id, l); chipVals.set(id, v); chipRow.append(b);
  }
  const detailBody = h('div', { class: 'detail-wrap' });
  const detailClose = h('button', { type: 'button', class: 'x', 'aria-label': 'Close the detail panel', title: 'Close (Esc)' }, icon('close'));
  const detailPanel = h('section', { id: 'detail-panel', class: 'glass', 'data-hud': '', hidden: true, 'aria-label': 'Selection details' },
    h('header', { class: 'drawer-head' }, h('h2', { text: 'Detail' }), detailClose), detailBody);
  const left = h('div', { id: 'hud-left' });
  let selected = null;
  const listeners = new Set();
  function select(entity) {
    selected = entity ?? null;
    if (selected) doc.dataset.selected = selected.id; else delete doc.dataset.selected;
    detailPanel.hidden = !selected;
    if (selected && mq?.matches) drawers.close({ restore: false });
    for (const fn of listeners) fn(selected);
  }
  detailClose.addEventListener('click', () => select(null));
  document.addEventListener('alisio:deselect', () => { if (selected) select(null); });
  const passCard = createPassCard({ onSelect: select });
  left.append(chipRow, passCard.el, detailPanel);

  // KPI cards (full set) live in the KPI drawer.
  const kpiGrid = h('section', { id: 'kpis', 'aria-label': 'Key indicators' });
  const cards = new Map();
  for (const [id, label] of [['today', 'Passes today (UTC)'], ['countdown', 'Next AOS in'], ['active', 'Active passes'], ['volume', 'Data, last 24 h'], ['timeliness', 'Timeliness (NRT)']]) {
    const c = createKpiCard(id, label); cards.set(id, c); kpiGrid.append(c.el);
  }

  root.append(left, ...drawers.elements(), drawers.tabbar);
  document.body.append(topbar, root);

  // Menu: area presets (adopted), panels, cinematic mode and the shortcut list.
  const menuPanels = h('div', { class: 'menu-list' }, ...DRAWERS.map((d) => {
    const b = h('button', { type: 'button', 'data-drawer': d.id, 'aria-keyshortcuts': d.key.toUpperCase() }, h('span', { text: d.title }), h('kbd', { 'aria-hidden': 'true', text: d.key.toUpperCase() }));
    b.addEventListener('click', () => { setMenu(false); drawers.toggle(d.id); });
    return b;
  }));
  const cineBtn = h('button', { type: 'button', 'aria-keyshortcuts': 'H' }, h('span', { text: 'Hide the interface' }), h('kbd', { 'aria-hidden': 'true', text: 'H' }));
  cineBtn.addEventListener('click', () => { setMenu(false); setCinematic(true); });
  const areas = document.getElementById('area-switcher');
  menu.append(
    h('p', { class: 'eyebrow', text: 'View' }), ...(areas ? [areas] : []),
    h('p', { class: 'eyebrow', text: 'Panels' }), menuPanels, cineBtn,
    h('p', { class: 'eyebrow', text: 'Shortcuts' }),
    h('p', { class: 'keys', text: '/ search | P passes | K KPIs | W weather | I about | H hide the interface | Esc close | ? this menu' }));
  let menuOpen = false;
  function setMenu(open, { focus = true } = {}) {
    if (open === menuOpen) return;
    menuOpen = open; menu.hidden = !open; menuBtn.setAttribute('aria-expanded', String(open));
    if (open) menu.focus({ preventScroll: true }); else if (focus && menu.contains(document.activeElement)) menuBtn.focus({ preventScroll: true });
  }
  function syncMenu() { for (const b of menuPanels.children) b.setAttribute('aria-pressed', String(b.dataset.drawer === drawers.current())); }
  menuBtn.addEventListener('click', () => setMenu(!menuOpen));
  document.addEventListener('pointerdown', (e) => { if (menuOpen && !menu.contains(e.target) && !menuBtn.contains(e.target)) setMenu(false, { focus: false }); });

  // Cinematic mode: only the disclaimer and a small hint stay.
  const hint = h('button', { type: 'button', id: 'cine-hint', 'aria-label': 'Show the interface (H)' }, h('kbd', { text: 'H' }), h('span', { text: 'show the interface' }));
  hint.addEventListener('click', () => setCinematic(false));
  document.body.append(hint);
  const cinematic = () => doc.hasAttribute('data-cinematic');
  function setCinematic(on) {
    if (on === cinematic()) return;
    if (on) { setMenu(false, { focus: false }); document.activeElement?.blur?.(); doc.setAttribute('data-cinematic', ''); } else { doc.removeAttribute('data-cinematic'); }
  }

  addEventListener('keydown', (e) => {
    const t = e.target;
    const typing = t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));
    if (e.key === 'Escape') {
      const target = escapeTarget({ cinematic: cinematic(), menu: menuOpen, drawer: drawers.current(), selected: !!selected });
      if (target === 'cinematic') setCinematic(false);
      else if (target === 'menu') setMenu(false);
      else if (target === 'drawer') drawers.close();
      else if (target === 'selection') select(null);
      if (target) e.preventDefault();
      return;
    }
    const a = keyAction({ key: e.key, ctrlKey: e.ctrlKey, metaKey: e.metaKey, altKey: e.altKey, typing });
    if (!a) return;
    e.preventDefault();
    if (a.type === 'toggle') { setMenu(false, { focus: false }); drawers.toggle(a.id); } else if (a.type === 'cinematic') setCinematic(!cinematic()); else setMenu(!menuOpen);
  });

  // The disclaimer height feeds the layout (the bottom row sits above it).
  const disclaimer = document.getElementById('disclaimer');
  const syncDisclaimer = () => doc.style.setProperty('--disclaimer-h', `${disclaimer?.offsetHeight ?? 28}px`);
  syncDisclaimer();
  if (typeof ResizeObserver !== 'undefined' && disclaimer) new ResizeObserver(syncDisclaimer).observe(disclaimer);
  addEventListener('resize', syncDisclaimer);

  // Source panel (provenance of the orbit data) lives in the About drawer.
  const stateChip = h('span', { class: 'chip' });
  const epochText = h('span', { class: 'num' });
  const ageText = h('span', { class: 'num' });
  const warning = h('div', { class: 'source-warning', role: 'status', hidden: true, text: 'Orbit data is older than 7 days; predictions may drift.' });
  const refreshBtn = h('button', { type: 'button', class: 's-btn', text: 'Refresh orbit data' });
  const refreshNote = h('p', { class: 's-note', 'aria-live': 'polite' });
  const outcomeNote = h('p', { class: 's-note', 'aria-live': 'polite' });
  const sourceBody = h('div', { class: 'source' },
    h('div', { class: 's-row' }, h('span', { text: 'State' }), stateChip),
    h('div', { class: 's-row' }, h('span', { text: 'Epoch' }), epochText),
    h('div', { class: 's-row' }, h('span', { text: 'Age' }), ageText),
    warning, refreshBtn, refreshNote, outcomeNote);

  let acc = REFRESH_MS, dirty = true;
  refreshBtn.addEventListener('click', async () => {
    refreshBtn.disabled = true;
    setText(outcomeNote, 'Requesting live orbit data...');
    const result = await orbitSource.refresh();
    setText(outcomeNote, refreshOutcomeText(result));
    dirty = true; // the schedule re-keys on the new epochs by itself (R3.7); the header just re-reads the source
  });

  /** Add a panel. It lands in its home drawer (or the detail panel); `order` sorts within it. */
  function mount(id, title, element, { order = 50 } = {}) {
    const home = panelHome(id);
    const inDetail = home === 'detail';
    const section = h('section', { class: inDetail ? 'detail-section' : `panel ${id}-section`, id: `panel-${id}`, 'aria-label': title || id },
      title && !inDetail ? h('h2', { text: title }) : '', element);
    section.style.order = String(order);
    (inDetail ? detailBody : drawers.bodyOf(home) ?? drawers.bodyOf('about')).append(section);
    return section;
  }
  mount('kpis', '', kpiGrid, { order: 10 });
  mount('source', 'Orbit source', sourceBody, { order: 70 });

  return {
    root,
    mount,
    /** Put a small element (a chip) in the header of the Weather drawer. */
    addChip(element) { drawers.slotOf('env').append(element); return element; },
    select,
    selected: () => selected,
    onSelect(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    theme: () => theme,
    drawers,
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
      const list = kpiCards(served, simMs);
      for (const c of list) cards.get(c.id).render(c);
      for (const c of kpiChips(list)) { setText(chipEls.get(c.id), c.label); setText(chipVals.get(c.id), c.value); }
      passCard.update(schedule, simMs);

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
