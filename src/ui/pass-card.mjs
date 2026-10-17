// The one floating card of the default scene: the pass in flight (or the next one) with satellite, antenna, band, rate,
// the LOS/AOS countdown and a five-stage progress bar. Activating it selects the satellite and opens the detail panel.
import { h, setText } from './dom.mjs';
import { badge } from './badge.mjs';
import { passCardModel } from './pass-card-model.mjs';
import { currentPassCard } from './tracker-model.mjs';

export function createPassCard({ onSelect }) {
  const kind = h('p', { class: 'eyebrow' });
  const when = h('div', { class: 'pc-t num' });
  const nameBtn = h('button', { type: 'button', class: 'pc-name' });
  const prov = h('span', { style: 'display:contents' });
  const bandChip = h('span', { class: 'bd' });
  const antenna = h('span', { class: 'chip plain', 'data-tone': 'info' });
  const rate = h('small', { class: 'num' });
  const stage = h('small', { class: 'pc-stage' });
  const segs = Array.from({ length: 5 }, () => h('b'));
  const bar = h('div', { class: 'pc-bar', 'aria-hidden': 'true' }, ...segs);
  const empty = h('p', { class: 'pc-empty', hidden: true });
  const body = h('div', { class: 'pc-body' },
    h('div', { class: 'pc-top' }, kind, when),
    h('div', { class: 'pc-id' }, nameBtn, prov),
    h('div', { class: 'pc-meta' }, bandChip, antenna, rate, stage), bar);
  const el = h('section', { id: 'pass-card', class: 'glass', 'data-hud': '', 'aria-label': 'Active pass' }, body, empty);
  let current = null, shown = null;
  const pick = () => { if (current) onSelect({ kind: 'satellite', id: `sat-${current.norad}`, label: current.name, provenance: current.provenance }); };
  nameBtn.addEventListener('click', (e) => { e.stopPropagation(); pick(); });
  el.addEventListener('click', pick);

  return {
    el,
    update(schedule, simMs) {
      current = currentPassCard(schedule, simMs);
      const m = passCardModel(current, simMs);
      body.hidden = m.empty; empty.hidden = !m.empty;
      el.dataset.live = String(!!m.live);
      if (m.empty) { setText(empty, m.text); el.setAttribute('aria-label', m.label); return; }
      el.setAttribute('aria-label', 'Active pass');
      nameBtn.setAttribute('aria-label', m.label);
      setText(kind, m.kind); setText(when, m.countdown); setText(nameBtn, m.name);
      if (shown !== current.id) { shown = current.id; prov.replaceChildren(badge(m.provenance)); }
      setText(bandChip, m.band); bandChip.dataset.band = m.band;
      setText(antenna, m.antenna); setText(rate, m.rate); setText(stage, m.stage);
      m.segments.forEach((s, i) => {
        segs[i].dataset.state = s.state; segs[i].title = s.label;
        if (s.state === 'active') segs[i].style.setProperty('--p', `${Math.round(Math.min(1, Math.max(0, m.fill * 4 - i)) * 100)}%`);
      });
    },
  };
}
