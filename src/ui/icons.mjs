// Small inline icons (stroke, currentColor). No image assets are shipped.
import { svg } from './dom.mjs';

const BASE = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false' };
const SHAPES = {
  sun: () => [svg('circle', { cx: 12, cy: 12, r: 4 }), svg('path', { d: 'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4' })],
  moon: () => [svg('path', { d: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z' })],
  auto: () => [svg('circle', { cx: 12, cy: 12, r: 9 }), svg('path', { d: 'M12 3a9 9 0 0 0 0 18z', fill: 'currentColor' })],
  search: () => [svg('circle', { cx: 11, cy: 11, r: 7 }), svg('path', { d: 'M20 20l-3.5-3.5' })],
  check: () => [svg('path', { d: 'M5 12.5l4.5 4.5L19 7.5', 'stroke-width': 3 })],
  chevron: () => [svg('path', { d: 'M6 9l6 6 6-6' })],
  cloud: () => [svg('path', { d: 'M7 18a4 4 0 0 1-.6-7.96A6 6 0 0 1 18 9.5a4.2 4.2 0 0 1-.5 8.5z' })],
  wind: () => [svg('path', { d: 'M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h7' })],
  rain: () => [svg('path', { d: 'M7 14a4 4 0 0 1-.6-7.96A6 6 0 0 1 18 5.5a4.2 4.2 0 0 1-.5 8.5zM8 18l-1 3M12 18l-1 3M16 18l-1 3' })],
  passes: () => [svg('path', { d: 'M4 6h16M4 12h16M4 18h10' })],
  kpis: () => [svg('path', { d: 'M5 20V11M12 20V5M19 20v-6' })],
  about: () => [svg('circle', { cx: 12, cy: 12, r: 9 }), svg('path', { d: 'M12 11v5M12 8v.01' })],
  menu: () => [svg('path', { d: 'M4 7h16M4 12h16M4 17h16' })],
  close: () => [svg('path', { d: 'M6 6l12 12M18 6L6 18' })],
  haze: () => [svg('path', { d: 'M4 9h16M2 13h20M5 17h14' })],
};

export function icon(name, size) {
  const el = svg('svg', { ...BASE, ...(size ? { width: size, height: size } : {}) }, ...(SHAPES[name] ?? SHAPES.sun)());
  return el;
}

/** Brand mark: a ground-station dish with a tracked satellite. */
export function logoMark() {
  return svg('svg', { viewBox: '0 0 32 32', width: 30, height: 30, 'aria-hidden': 'true', focusable: 'false' },
    svg('rect', { width: 32, height: 32, rx: 9, fill: 'var(--accent)' }),
    svg('path', { d: 'M9 21a9 9 0 0 1 9-9', fill: 'none', stroke: '#fff', 'stroke-width': 2.4, 'stroke-linecap': 'round' }),
    svg('path', { d: 'M9 21l5.5-5.5', stroke: '#fff', 'stroke-width': 2.4, 'stroke-linecap': 'round' }),
    svg('circle', { cx: 22.5, cy: 9.5, r: 2.4, fill: '#fff' }),
    svg('path', { d: 'M11 25h10', stroke: '#fff', 'stroke-width': 2.4, 'stroke-linecap': 'round' }));
}
