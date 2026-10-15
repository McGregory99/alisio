// Provenance legend (R7.7): explains the two badge values used across the scene, tables and detail.
import { h } from './dom.mjs';
import { badge } from './badge.mjs';

export const LEGEND = Object.freeze([
  { provenance: 'verified', text: 'Confirmed from public sources.' },
  { provenance: 'illustrative', text: 'Artistic placeholder or assumption, not a real installation or figure.' },
]);

export function createLegend({ dashboard }) {
  const list = h('ul', { class: 'legend' }, ...LEGEND.map((l) => h('li', {}, badge(l.provenance), h('span', { text: ` ${l.text}` }))));
  dashboard.mount('legend', 'Provenance legend', list, { order: 60 });
}
