// Pure view model of the time control (R6.5).
import { RATES, nextPassTime } from '../core/clock.mjs';

/** Buttons with their pressed state, derived from the clock. Pause is independent of the rate. */
export function timeButtons(clock) {
  const live = clock.isLive();
  return [
    { id: 'live', label: 'Live', pressed: live },
    ...RATES.filter((r) => r > 1).map((r) => ({ id: `rate-${r}`, label: `${r}x`, pressed: !live && clock.rate() === r })),
    { id: 'pause', label: 'Pause', pressed: clock.isPaused() },
  ];
}

export const formatUtc = (ms) => `${new Date(ms).toISOString().slice(0, 19).replace('T', ' ')} UTC`;

/** Time to jump to for "next pass": earliest pre-position time among served (assigned) passes after now. */
export function nextPassTarget(assignments, nowMs) {
  return nextPassTime(assignments.filter((a) => a.status === 'assigned').map((a) => a.pass), nowMs);
}
