// Provenance badge element (R7.7): `verified` or `illustrative`, same colours as the scene labels.
import { badgeFor } from '../scene/labels-math.mjs';
import { h } from './dom.mjs';

export function badge(provenance) {
  const b = badgeFor(provenance);
  const el = h('span', { class: 'badge', 'data-provenance': provenance === 'verified' ? 'verified' : 'illustrative', text: b.text });
  el.style.background = b.color;
  return el;
}
