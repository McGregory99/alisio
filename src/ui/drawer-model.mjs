// Pure model of the drawers (progressive disclosure): which panel lives where, one drawer open at a time,
// the keyboard map and what Escape closes first. No DOM.

/** Drawers in tab-bar order. `key` is the single-letter shortcut. */
export const DRAWERS = Object.freeze([
  { id: 'passes', label: 'Passes', title: 'Passes and tables', key: 'p' },
  { id: 'kpis', label: 'KPIs', title: 'Key indicators', key: 'k' },
  { id: 'env', label: 'Weather', title: 'Weather and EDRS relays', key: 'w' },
  { id: 'about', label: 'About', title: 'About the data', key: 'i' },
]);

const HOME = { kpis: 'kpis', tracker: 'passes', globe: 'passes', tables: 'passes', weather: 'env', edrs: 'env', legend: 'about', notes: 'about', source: 'about', detail: 'detail' };

/** Where a mounted panel goes: a drawer id, or 'detail' for the selection panel. Unknown panels go to About. */
export const panelHome = (panelId) => HOME[panelId] ?? 'about';

/** Selecting the open tab again closes it; selecting another one replaces it. */
export const toggleDrawer = (current, id) => (current === id ? null : id);

/** Keyboard shortcut for a keydown, or null. Ignored while typing and with Ctrl, Meta or Alt held. */
export function keyAction({ key, ctrlKey, metaKey, altKey, typing }) {
  if (typing || ctrlKey || metaKey || altKey) return null;
  if (key === '?') return { type: 'menu' };
  const k = key.toLowerCase();
  if (k === 'h') return { type: 'cinematic' };
  const d = DRAWERS.find((x) => x.key === k);
  return d ? { type: 'toggle', id: d.id } : null;
}

/** What Escape closes first: the cinematic mode, the menu, the open drawer, then the selection. */
export function escapeTarget({ cinematic, menu, drawer, selected }) {
  if (cinematic) return 'cinematic';
  if (menu) return 'menu';
  if (drawer) return 'drawer';
  return selected ? 'selection' : null;
}
