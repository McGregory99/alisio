// Area switcher (R6.4): preset buttons, plus a station list when the data holds more than one station.
// Native buttons and select: Tab/Enter/Space/arrow keys work, focus ring from base-style.
import { injectBaseStyle } from './base-style.mjs';

export function createAreaSwitcher({ areas, stations = [], onArea, onStation = () => {} }) {
  injectBaseStyle();
  const root = document.createElement('div');
  root.className = 'hud'; root.setAttribute('role', 'group'); root.setAttribute('aria-label', 'Area');
  root.style.cssText = 'left:12px;top:54px;display:flex;flex-wrap:wrap;gap:6px;max-width:300px';
  for (const a of areas) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = a.label; b.dataset.area = a.id;
    b.addEventListener('click', () => onArea(a));
    root.append(b);
  }
  if (stations.length) {
    const sel = document.createElement('select');
    sel.setAttribute('aria-label', 'Station');
    for (const s of stations) sel.append(new Option(s.label, s.id));
    sel.addEventListener('change', () => onStation(sel.value));
    root.append(sel);
  }
  document.body.appendChild(root);
  return { root };
}
