// Provenance legend (R7.7) and the notes and assumptions: both live in the About drawer, so the other panels stay short.
import { h } from './dom.mjs';
import { badge } from './badge.mjs';
import { TTC_STATEMENT } from './detail-model.mjs';
import { REFERENCE_NOTE } from '../core/pointing.mjs';

export const LEGEND = Object.freeze([
  { provenance: 'verified', text: 'Confirmed from public sources.' },
  { provenance: 'illustrative', text: 'Artistic placeholder or assumption, not a real installation or figure.' },
]);

export function createLegend({ dashboard }) {
  const list = h('ul', { class: 'legend' }, ...LEGEND.map((l) => h('li', {}, badge(l.provenance), h('span', { text: ` ${l.text}` }))));
  dashboard.mount('legend', 'Provenance legend', list, { order: 60 });
  const notes = h('div', { class: 'notes' }, h('p', { text: TTC_STATEMENT }), h('p', { text: REFERENCE_NOTE }),
    h('p', { text: 'Rates, data volumes and Doppler use illustrative values. Weather is a preset you choose, not a live feed.' }));
  dashboard.mount('notes', 'Notes and assumptions', notes, { order: 65 });
}
