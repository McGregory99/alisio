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

/** Top bar clock: UTC time and date plus the mode (live, simulated at a rate, or paused). `state`: { live, paused, rate }. */
export function clockChip({ live, paused, rate }, simMs) {
  const iso = new Date(simMs).toISOString();
  const base = { time: iso.slice(11, 19), date: iso.slice(0, 10) };
  if (paused) return { ...base, mode: 'PAUSED', tone: 'paused' };
  if (live) return { ...base, mode: 'LIVE', tone: 'live' };
  return { ...base, mode: `SIM x${rate}`, tone: 'sim' };
}
