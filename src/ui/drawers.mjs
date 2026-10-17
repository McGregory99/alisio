// Drawers (progressive disclosure): a bottom tab bar and one panel open at a time. On desktop a drawer is a side panel
// that leaves the scene centre free; at 768 px and below it is a bottom sheet above the tab bar.
// Focus moves into the opened drawer and returns to its tab when it closes; Escape is handled by the dashboard.
import { h } from './dom.mjs';
import { icon } from './icons.mjs';
import { DRAWERS, toggleDrawer } from './drawer-model.mjs';

export function createDrawers({ onChange = () => {} } = {}) {
  const doc = document.documentElement;
  const tabbar = h('nav', { id: 'tabbar', class: 'glass', 'data-hud': '', 'aria-label': 'Panels' });
  const parts = new Map();
  let current = null;

  for (const d of DRAWERS) {
    const tip = `${d.title} (${d.key.toUpperCase()})`;
    const tab = h('button', { type: 'button', class: 'tab', 'data-drawer': d.id, 'aria-expanded': 'false', 'aria-controls': `drawer-${d.id}`, 'aria-keyshortcuts': d.key.toUpperCase(), title: tip },
      icon(d.id), h('span', { text: d.label }), h('kbd', { 'aria-hidden': 'true', text: d.key.toUpperCase() }));
    const closeBtn = h('button', { type: 'button', class: 'x', 'aria-label': `Close ${d.title}`, title: 'Close (Esc)' }, icon('close'));
    const slot = h('span', { class: 'head-slot' });
    const body = h('div', { class: 'drawer-body' });
    const el = h('section', { id: `drawer-${d.id}`, class: 'drawer glass', 'data-hud': '', hidden: true, tabindex: '-1', role: 'region', 'aria-label': d.title },
      h('header', { class: 'drawer-head' }, h('h2', { text: d.title }), slot, closeBtn), body);
    tab.addEventListener('click', () => set(toggleDrawer(current, d.id)));
    closeBtn.addEventListener('click', () => set(null));
    parts.set(d.id, { tab, el, body, slot });
    tabbar.append(tab);
  }

  function set(id, { restore = true } = {}) {
    if (id === current) return;
    const prev = current ? parts.get(current) : null;
    const hadFocus = !!prev && prev.el.contains(document.activeElement);
    current = id;
    for (const [k, p] of parts) { p.el.hidden = k !== id; p.tab.setAttribute('aria-expanded', String(k === id)); }
    if (id) { doc.dataset.drawer = id; parts.get(id).el.focus({ preventScroll: true }); } else {
      delete doc.dataset.drawer;
      if (hadFocus && restore) prev.tab.focus({ preventScroll: true });
    }
    onChange(current);
  }

  return {
    tabbar,
    elements: () => [...parts.values()].map((p) => p.el),
    bodyOf: (id) => parts.get(id)?.body,
    slotOf: (id) => parts.get(id)?.slot,
    current: () => current,
    open: (id) => set(id),
    close: (opts) => set(null, opts),
    toggle: (id) => set(toggleDrawer(current, id)),
  };
}
