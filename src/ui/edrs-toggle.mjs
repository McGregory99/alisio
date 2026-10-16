// EDRS relay toggle (R8.3): a native checkbox, off by default, with the historical/unverified note.
import { h } from './dom.mjs';

export function createEdrsToggle({ dashboard, edrs }) {
  const box = h('input', { type: 'checkbox', id: 'edrs-toggle' });
  box.addEventListener('change', () => edrs.setEnabled(box.checked));
  const body = h('div', { class: 'weather' },
    h('label', { for: 'edrs-toggle', class: 'toggle' }, box, h('span', { text: ' Show EDRS relays (9 E and 31 E)' })),
    h('p', { class: 'note', text: edrs.note }));
  dashboard.mount('edrs', 'EDRS relays (optional)', body, { order: 26 });
  return { update() {} };
}
