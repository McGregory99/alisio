// Pure model of the floating pass card: the pass in flight, or the next served one, in a few short lines. No DOM.
import { passStepper } from './tracker-model.mjs';
import { formatCountdown } from './dashboard-model.mjs';

/** @param {object|null} card currentPassCard() result; @param {number} nowMs simulated time */
export function passCardModel(card, nowMs) {
  if (!card) return { empty: true, kind: 'Passes', text: 'No served pass in the schedule window.', label: 'No served pass in the schedule window.' };
  const s = passStepper(card.pass, nowMs);
  const stage = s.steps[s.activeIndex];
  const live = s.activeIndex >= 1;
  const kind = live ? 'Active pass' : 'Next pass';
  const countdown = s.activeIndex === 2 ? `LOS in ${formatCountdown(s.losInMs)}`
    : s.activeIndex === 3 ? 'LOS, post-pass hold'
      : s.activeIndex === 4 ? 'Delivered'
        : `AOS in ${formatCountdown(card.aos - nowMs)}`;
  const segments = s.steps.map((st) => ({ label: st.label, state: st.active ? 'active' : st.done ? 'done' : 'todo' }));
  return {
    empty: false, kind, live, countdown, stage: stage.label, fill: s.fill, segments,
    name: card.name, norad: card.norad, provenance: card.provenance, antenna: card.antennaId, band: card.band, rate: `${card.rateMbps} Mb/s`,
    label: `${kind}: ${card.name} on ${card.antennaId}, ${card.band} band, ${countdown}. Activate to open the details.`,
  };
}
