// Pass tracker (R7.4, R5.6): upcoming and current passes with lifecycle state and timeliness status.
// Rows are buttons, so the list is keyboard operable; activating one selects the satellite in the detail panel.
import { h, setText } from './dom.mjs';
import { trackerRows } from './tracker-model.mjs';

const REFRESH_MS = 500;

export function createTracker({ dashboard }) {
  const list = h('ul', { class: 'tracker', 'aria-label': 'Upcoming and current passes' });
  dashboard.mount('tracker', 'Pass tracker', list, { order: 30 });
  let acc = REFRESH_MS;
  const cells = new Map(); // pass id -> { li, state, nrt }

  return {
    update({ simMs, dt, schedule }) {
      acc += Math.max(0, dt) * 1000;
      if (acc < REFRESH_MS) return;
      acc = 0;
      const rows = trackerRows(schedule, simMs);
      const seen = new Set();
      const order = [];
      for (const r of rows) {
        seen.add(r.id);
        let c = cells.get(r.id);
        if (!c) {
          const btn = h('button', { type: 'button', class: 'pass-row' });
          c = { li: h('li', { 'data-pass': r.id }, btn), btn, name: h('strong'), state: h('span', { class: 'state' }), meta: h('span', { class: 'muted num' }), nrt: h('span', { class: 'nrt' }) };
          btn.append(h('span', { class: 'row' }, c.name, c.state), h('span', { class: 'row' }, c.meta, c.nrt));
          btn.addEventListener('click', () => dashboard.select({ kind: 'satellite', id: `sat-${r.norad}`, label: r.name, provenance: r.provenance }));
          cells.set(r.id, c);
        }
        setText(c.name, r.name);
        setText(c.state, r.phase);
        c.li.dataset.phase = r.phase;
        setText(c.meta, `${r.aosUtc} UTC, max ${r.maxElDeg.toFixed(0)}°, ${r.served ? r.antennaId : 'unserved'}`);
        setText(c.nrt, `NRT ${r.timeliness.status}${r.timeliness.illustrative ? ' (illustrative)' : ''}`);
        c.nrt.dataset.status = r.timeliness.status;
        order.push(c.li);
      }
      for (const [id, c] of cells) if (!seen.has(id)) { c.li.remove(); cells.delete(id); }
      list.replaceChildren(...order);
    },
  };
}
