// Pure state machine of the local <-> space hand-over. No Three.js, no DOM.
// local --(zoom out past the limit)--> to-space --(fade)--> space --(zoom in past the limit / Esc / button)--> to-local --> local
export const FADE_S = 0.7;          // total fade-through; the scene switches at the midpoint, behind a fully dark overlay
export const ZOOM_THRESHOLD = 300;  // accumulated wheel/pinch units pushed past the limit before the hand-over starts
export const ZOOM_IDLE_MS = 800;    // a pause this long forgets the push

export const initialTransition = () => ({ phase: 'local', t: 0 });

/** @param {{phase:string,t:number}} s @param {{dt?:number, enterSpace?:boolean, leaveSpace?:boolean}} i */
export function stepTransition(s, { dt = 0, enterSpace = false, leaveSpace = false } = {}) {
  switch (s.phase) {
    case 'local': return enterSpace ? { phase: 'to-space', t: 0 } : s;
    case 'space': return leaveSpace ? { phase: 'to-local', t: 0 } : s;
    case 'to-space': { const t = s.t + dt; return t >= FADE_S ? { phase: 'space', t: 0 } : { phase: 'to-space', t }; }
    case 'to-local': { const t = s.t + dt; return t >= FADE_S ? { phase: 'local', t: 0 } : { phase: 'to-local', t }; }
    default: return initialTransition();
  }
}

/** Opacity (0..1) of the dark overlay: rises to 1 at the midpoint of a transition and falls back. */
export function fadeAlpha(s) {
  if (s.phase !== 'to-space' && s.phase !== 'to-local') return 0;
  const k = Math.min(1, s.t / FADE_S);
  const a = k < 0.5 ? k * 2 : (1 - k) * 2;
  return a * a * (3 - 2 * a);
}

/** Which scene is drawn: the space scene from the midpoint of the way in until the midpoint of the way out. */
export function showsSpace(s) {
  if (s.phase === 'space') return true;
  if (s.phase === 'to-space') return s.t >= FADE_S / 2;
  if (s.phase === 'to-local') return s.t < FADE_S / 2;
  return false;
}

/** Pointer input is only live (local or space controls) outside the fades. */
export const inputLive = (s) => s.phase === 'local' || s.phase === 'space';

/**
 * Zoom intent. `deltaY` > 0 is zoom out (wheel convention; pinch is mapped onto it). In the local scene only pushing out
 * while at the maximum distance counts; in space only pushing in while at the minimum distance counts.
 * @returns {{acc:{amount:number,lastMs:number}, enterSpace:boolean, leaveSpace:boolean}}
 */
export function pushZoom(acc, { phase, deltaY, distance, localMax, spaceMin, nowMs }) {
  const reset = { amount: 0, lastMs: nowMs };
  let atLimit, towardsExit;
  if (phase === 'local') { atLimit = distance >= localMax - 0.5; towardsExit = deltaY > 0; }
  else if (phase === 'space') { atLimit = distance <= spaceMin * 1.01; towardsExit = deltaY < 0; }
  else return { acc: reset, enterSpace: false, leaveSpace: false };
  if (!atLimit || !towardsExit) return { acc: reset, enterSpace: false, leaveSpace: false };
  const base = nowMs - acc.lastMs > ZOOM_IDLE_MS ? 0 : acc.amount;
  const amount = base + Math.abs(deltaY);
  const fired = amount >= ZOOM_THRESHOLD;
  return { acc: fired ? reset : { amount, lastMs: nowMs }, enterSpace: fired && phase === 'local', leaveSpace: fired && phase === 'space' };
}
