// Mobile bottom sheet (R7.9): at 768 px and below the dashboard becomes a sheet above the disclaimer.
// The handle is a native button (tap, Enter and Space toggle) and also follows a vertical drag.
import { h, setText } from './dom.mjs';
import { PRODUCT_NAME } from './branding.mjs';
import { isMobile, afterGesture, sheetHeight, MOBILE_MAX_PX } from './sheet-model.mjs';
import { kpis } from '../core/kpi.mjs';
import { formatCountdown } from './dashboard-model.mjs';

export function createSheet({ dashboard }) {
  const root = document.documentElement;
  const disclaimer = document.getElementById('disclaimer');
  const summary = h('span', { class: 'muted num' });
  const handle = h('button', { type: 'button', class: 'sheet-handle', 'aria-expanded': 'false', 'aria-controls': 'dashboard' },
    h('span', { class: 'grip', 'aria-hidden': 'true' }), h('strong', { text: PRODUCT_NAME }), summary);
  dashboard.root.prepend(handle);

  let state = 'collapsed', drag = null, viaPointer = false;
  const disclaimerH = () => disclaimer?.offsetHeight ?? 28;
  const mobile = () => isMobile(window.innerWidth);

  function apply(dy = 0) {
    root.style.setProperty('--disclaimer-h', `${disclaimerH()}px`);
    if (!mobile()) { root.style.setProperty('--sheet-h', '0px'); dashboard.root.removeAttribute('data-sheet'); root.removeAttribute('data-sheet'); dashboard.root.style.height = ''; return; }
    const hpx = sheetHeight(state, window.innerHeight, disclaimerH(), dy);
    dashboard.root.dataset.sheet = state;
    root.dataset.sheet = state;
    dashboard.root.style.height = `${hpx}px`;
    root.style.setProperty('--sheet-h', `${hpx}px`);
    handle.setAttribute('aria-expanded', String(state === 'expanded'));
  }

  handle.addEventListener('pointerdown', (e) => { drag = { y: e.clientY }; handle.setPointerCapture?.(e.pointerId); });
  handle.addEventListener('pointermove', (e) => { if (drag) apply(e.clientY - drag.y); });
  handle.addEventListener('pointerup', (e) => {
    if (!drag) return;
    const dy = e.clientY - drag.y; drag = null;
    state = afterGesture(state, dy); viaPointer = true; apply();
  });
  handle.addEventListener('pointercancel', () => { drag = null; apply(); });
  // Enter, Space and assistive-technology activation arrive as a click without a pointer gesture.
  handle.addEventListener('click', () => { if (viaPointer) { viaPointer = false; return; } state = afterGesture(state, 0); apply(); });
  window.addEventListener('resize', () => apply());
  if (typeof ResizeObserver !== 'undefined' && disclaimer) new ResizeObserver(() => apply()).observe(disclaimer);
  apply();

  return {
    handle,
    state: () => state,
    mobileMax: MOBILE_MAX_PX,
    update({ simMs, schedule }) {
      if (!mobile()) return;
      const served = schedule.assignments.filter((a) => a.status === 'assigned').map((a) => a.pass);
      const k = kpis(served, simMs);
      setText(summary, `Next AOS ${formatCountdown(k.countdownMs)} | ${k.activeCount} active`);
    },
  };
}
