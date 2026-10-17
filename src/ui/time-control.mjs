// Time control (R6.5, R6.6): Live, 10x/60x/600x, Pause and Next pass, plus the UTC clock chip for the top bar.
// Native buttons: focusable, Enter/Space activate, visible focus ring from styles.css.
// The dashboard adopts both elements (#time-control into the dock, #clock-chip into the top bar).
import { timeButtons, nextPassTarget, clockChip } from './time-control-model.mjs';
import { h, setText } from './dom.mjs';

export function createTimeControl({ clock }) {
  const root = h('div', { id: 'time-control', class: 'timebar', role: 'group', 'aria-label': 'Time control' });

  const time = h('span', { class: 't' });
  const mode = h('span');
  const dot = h('i');
  const chip = h('div', { id: 'clock-chip', class: 'clock-chip', role: 'timer', 'aria-label': 'Simulated UTC time' }, time, h('div', { class: 's' }, dot, mode, h('span', { text: 'UTC' })));

  const actions = {
    live: () => clock.goLive(),
    pause: () => (clock.isPaused() ? clock.resume() : clock.pause()),
  };
  const buttons = new Map();
  for (const b of timeButtons(clock)) {
    const el = h('button', { type: 'button', 'data-id': b.id, text: b.label });
    el.addEventListener('click', () => (actions[b.id] ?? (() => { clock.setRate(Number(b.id.slice(5))); if (clock.isPaused()) clock.resume(); }))());
    buttons.set(b.id, el); root.append(el);
  }
  const next = h('button', { type: 'button', 'data-id': 'next-pass', text: 'Next pass' });
  let lastAssignments = [];
  next.addEventListener('click', () => {
    const t = nextPassTarget(lastAssignments, clock.now());
    if (t != null) clock.seek(t);
  });
  root.append(next);
  document.body.append(chip, root);

  return {
    root, chip,
    update({ simMs, schedule }) {
      lastAssignments = schedule.assignments;
      const c = clockChip({ live: clock.isLive(), paused: clock.isPaused(), rate: clock.rate() }, simMs);
      setText(time, c.time); setText(mode, c.mode); chip.dataset.tone = c.tone;
      chip.title = `${c.date} UTC`;
      for (const b of timeButtons(clock)) buttons.get(b.id).setAttribute('aria-pressed', String(b.pressed));
      next.disabled = nextPassTarget(lastAssignments, simMs) == null;
    },
  };
}
