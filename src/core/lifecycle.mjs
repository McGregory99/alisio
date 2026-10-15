// Pass lifecycle (R5.3): pure function of (pass, time). null -> pre-position -> downlink -> los -> delivered.
export const PREPOSITION_MS = 120_000;
export const LOS_HOLD_MS = 60_000; // matches the scheduler's post-LOS busy margin

export function phaseAt(pass, tMs) {
  if (tMs < pass.aos - PREPOSITION_MS) return null;
  if (tMs < pass.aos) return 'pre-position';
  if (tMs < pass.los) return 'downlink';
  if (tMs < pass.los + LOS_HOLD_MS) return 'los';
  return 'delivered';
}
