// Area switcher (R6.4): preset tabs, plus a station list when the data holds more than one station.
// Native buttons and select: Tab/Enter/Space/arrow keys work. The dashboard adopts the element into the top bar.
import { h } from './dom.mjs';

export function createAreaSwitcher({ areas, stations = [], onArea, onStation = () => {} }) {
  const root = h('div', { id: 'area-switcher', class: 'areas', role: 'group', 'aria-label': 'Area' });
  const buttons = new Map();
  const show = (id) => { for (const [k, b] of buttons) b.setAttribute('aria-pressed', String(k === id)); };
  for (const a of areas) {
    const b = h('button', { type: 'button', 'data-area': a.id, text: a.label, 'aria-pressed': 'false' });
    b.addEventListener('click', () => { show(a.id); onArea(a); });
    buttons.set(a.id, b); root.append(b);
  }
  if (areas[0]) show(areas[0].id); // the camera starts on the first preset
  if (stations.length) {
    const sel = h('select', { 'aria-label': 'Station' });
    for (const s of stations) sel.append(new Option(s.label, s.id));
    sel.addEventListener('change', () => onStation(sel.value));
    root.append(sel);
  }
  document.body.appendChild(root);
  return { root };
}
