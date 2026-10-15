// Time control (R6.5, R6.6): Live, 10x/60x/600x, Pause and Next pass, with the simulated UTC time.
// Native buttons: focusable, Enter/Space activate, visible focus ring from base-style.
import { injectBaseStyle } from './base-style.mjs';
import { timeButtons, formatUtc, nextPassTarget } from './time-control-model.mjs';

export function createTimeControl({ clock }) {
  injectBaseStyle();
  const root = document.createElement('div');
  root.className = 'hud'; root.setAttribute('role', 'group'); root.setAttribute('aria-label', 'Time control');
  root.style.cssText = 'left:50%;transform:translateX(-50%);bottom:40px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:center;max-width:94vw';
  const clockText = document.createElement('span');
  clockText.style.cssText = 'padding:6px 10px;border-radius:8px;background:rgba(12,18,28,.8);font-variant-numeric:tabular-nums';
  root.append(clockText);

  const actions = {
    live: () => clock.goLive(),
    pause: () => (clock.isPaused() ? clock.resume() : clock.pause()),
  };
  const buttons = new Map();
  for (const b of timeButtons(clock)) {
    const el = document.createElement('button');
    el.type = 'button'; el.textContent = b.label; el.dataset.id = b.id;
    el.addEventListener('click', () => (actions[b.id] ?? (() => { clock.setRate(Number(b.id.slice(5))); if (clock.isPaused()) clock.resume(); }))());
    buttons.set(b.id, el); root.append(el);
  }
  const next = document.createElement('button');
  next.type = 'button'; next.textContent = 'Next pass'; next.dataset.id = 'next-pass';
  let lastAssignments = [];
  next.addEventListener('click', () => {
    const t = nextPassTarget(lastAssignments, clock.now());
    if (t != null) clock.seek(t);
  });
  root.append(next);
  document.body.appendChild(root);

  return {
    root,
    update({ simMs, schedule }) {
      lastAssignments = schedule.assignments;
      clockText.textContent = formatUtc(simMs);
      for (const b of timeButtons(clock)) buttons.get(b.id).setAttribute('aria-pressed', String(b.pressed));
      next.disabled = nextPassTarget(lastAssignments, simMs) == null;
    },
  };
}
