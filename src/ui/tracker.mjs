// Pass tracker (R7.4, R5.6): the pass in flight (or the next served one) as a big card with a lifecycle stepper,
// timestamps, a live AOS/LOS countdown and the pass facts. Rates and Doppler are illustrative and labelled so.
import { h, setText } from './dom.mjs';
import { icon } from './icons.mjs';
import { badge } from './badge.mjs';
import { currentPassCard, passStepper } from './tracker-model.mjs';
import { formatCountdown } from './dashboard-model.mjs';
import { formatDoppler } from './detail-model.mjs';
import { rangeRate, dopplerHz } from '../core/passes.mjs';
import { MASPALOMAS } from '../data/stations/maspalomas.mjs';

const REFRESH_MS = 250;

export function createTracker({ dashboard, station = MASPALOMAS }) {
  const bandChip = h('span', { class: 'bd' });
  const nameBtn = h('button', { type: 'button', class: 'name' });
    const antennaChip = h('span', { class: 'chip plain', 'data-tone': 'info' });
  const provSlot = h('span', { style: 'display:contents' });
  const tt = h('div', { class: 'tt num' });
  const ttSub = h('small');
  const fill = h('div', { class: 'fill' });
  const steps = [];
  const stepper = h('div', { class: 'stepper', role: 'list', 'aria-label': 'Pass lifecycle' }, fill);
  for (let i = 0; i < 5; i += 1) {
    const dot = h('span', { class: 'dot' }, icon('check'));
    const lb = h('span', { class: 'lb' }), tm = h('span', { class: 'tm num' });
    const el = h('div', { class: 'step', role: 'listitem' }, dot, lb, tm);
    steps.push({ el, lb, tm }); stepper.append(el);
  }
  const cell = (key, title) => { const v = h('div', { class: 'v num' }); return { v, el: h('div', { class: 'cell', title }, h('p', { class: 'eyebrow', text: key }), v) }; };
  const data = cell('Data*', 'Estimated from the illustrative downlink rate and the elapsed pass time.');
  const rate = cell('Rate*', 'Illustrative downlink rate of the mission.');
  const maxEl = cell('Max el', 'Maximum elevation of the pass.');
  const dop = cell('Doppler*', 'Doppler shift on an illustrative 8 GHz X-band carrier, while the satellite is in view.');
  const stats = h('div', { class: 'trk-stats' }, data.el, rate.el, maxEl.el, dop.el);
  const top = h('div', { class: 'trk-top' }, h('div', { class: 'trk-id' }, h('div', { class: 'trk-name' }, bandChip, nameBtn), h('div', { class: 'trk-meta' }, antennaChip, ttSub)), h('div', { class: 'trk-t' }, tt));
  const empty = h('p', { class: 'trk-empty', text: 'No served pass in the schedule window.', hidden: true });
  const wrap = h('div', { class: 'trk' }, h('div', { class: 'trk-eyebrow' }, h('p', { class: 'eyebrow' }, 'Pass tracker'), h('div', { class: 'right' }, h('p', { class: 'eyebrow', title: 'Data volume, rate and Doppler are illustrative estimates.' }, h('small', { text: '* illustrative' })), provSlot)), top, stepper, stats, empty);
  dashboard.mount('tracker', '', wrap, { order: 30 });
  document.getElementById('panel-tracker')?.setAttribute('aria-label', 'Pass tracker');

  let acc = REFRESH_MS, shown = null, current = null;
  nameBtn.addEventListener('click', () => { if (current) dashboard.select({ kind: 'satellite', id: `sat-${current.norad}`, label: current.name, provenance: current.provenance }); });

  const COUNT = {
    scheduled: (c, s) => ({ t: `AOS in ${formatCountdown(c.aos - s.now)}`, sub: 'scheduled' }),
    'pre-position': (c, s) => ({ t: `AOS in ${formatCountdown(c.aos - s.now)}`, sub: 'antenna pre-positioning' }),
    downlink: (c, s) => ({ t: `LOS in ${formatCountdown(s.losInMs)}`, sub: 'downlinking now' }),
    los: () => ({ t: 'LOS', sub: 'post-LOS hold' }),
    delivered: () => ({ t: 'Delivered', sub: 'lifecycle complete' }),
  };

  return {
    update({ simMs, dt, schedule }) {
      acc += Math.max(0, dt) * 1000;
      if (acc < REFRESH_MS) return;
      acc = 0;
      const c = currentPassCard(schedule, simMs);
      current = c;
      top.hidden = stepper.hidden = stats.hidden = !c;
      empty.hidden = !!c;
      if (!c) return;
      const s = passStepper(c.pass, simMs);
      if (shown !== c.id) {
        shown = c.id;
        setText(bandChip, c.band); bandChip.dataset.band = c.band;
        setText(nameBtn, c.name);
        provSlot.replaceChildren(badge(c.provenance));
        s.steps.forEach((st, i) => { setText(steps[i].lb, st.label); steps[i].el.title = st.id === 'pre-position' ? 'Pre-position: the antenna slews to the AOS point, 2 minutes before AOS' : st.label; });
        setText(rate.v, `${c.rateMbps} Mb/s`);
        setText(maxEl.v, `${c.maxElDeg.toFixed(0)}°`);
      }
      setText(antennaChip, c.antennaId);
      s.steps.forEach((st, i) => {
        steps[i].el.toggleAttribute('data-done', st.done);
        steps[i].el.toggleAttribute('data-active', st.active);
        if (st.active) steps[i].el.setAttribute('aria-current', 'step'); else steps[i].el.removeAttribute('aria-current');
        setText(steps[i].tm, st.timeUtc ?? 'queued');
      });
      fill.style.width = `${(s.fill * 80).toFixed(1)}%`;
      const phase = s.steps[s.activeIndex].id;
      const txt = COUNT[phase]({ aos: c.aos, ...c }, { now: simMs, losInMs: s.losInMs });
      setText(tt, txt.t); setText(ttSub, txt.sub);
      const elapsedS = Math.max(0, Math.min(simMs, c.los) - c.aos) / 1000;
      setText(data.v, `${((c.rateMbps * elapsedS) / 8 / 1000).toFixed(1)} GB`);
      const sat = schedule.satellites.find((x) => x.norad === c.norad);
      const mission = sat?.mission;
      setText(dop.v, sat && mission && s.activeIndex === 2 && sat.elDeg > 0 ? formatDoppler(dopplerHz(mission.downlink.hz, rangeRate(sat.sat, station.location, simMs))) : '--');
    },
  };
}
