// Dish pointing (R5.4). The target comes from the same geoLookAngles used by the pass search, so the
// boresight and the tracker agree by construction. Reference point (A5): look angles are computed from the
// station geodetic origin; the scene applies them at each antenna's elevation pivot, which sits within a few
// tens of metres of the origin (negligible against a >= 700 km range).
import { geoLookAngles } from './geo.mjs';
import { phaseAt } from './lifecycle.mjs';

export const STOW = Object.freeze({ azDeg: 0, elDeg: 90 }); // zenith, matches the scene's stowed dish
const PREPOSITION_EL_DEG = 5; // illustrative: wait just above the mask at the AOS azimuth

/**
 * @param {object|null} pass assigned pass, or null when idle
 * @param {number} tMs simulation time
 * @param {object} antenna station antenna record (pivot placement is applied by the scene)
 * @param {{sat: object, observer: object}} ctx satrec from toSatrec and the station location
 */
export function dishTarget(pass, tMs, antenna, { sat, observer }) {
  const phase = pass ? phaseAt(pass, tMs) : null;
  if (phase === 'downlink') {
    const la = geoLookAngles(observer, sat, new Date(tMs));
    if (la) return { azDeg: la.azDeg, elDeg: la.elDeg, mode: 'track' };
  }
  if (phase === 'pre-position') return { azDeg: pass.aosAzDeg, elDeg: PREPOSITION_EL_DEG, mode: 'pre-position' };
  if (phase === 'los') return { azDeg: pass.losAzDeg, elDeg: PREPOSITION_EL_DEG, mode: 'park' };
  return { ...STOW, mode: 'stow' };
}

const step = (cur, delta, max) => cur + Math.sign(delta) * Math.min(Math.abs(delta), max);

/** Move toward `target` at most `slewDegS * dtS` degrees per axis; azimuth takes the shortest way round. */
export function slewStep(current, target, slewDegS, dtS) {
  const max = slewDegS * dtS;
  const daz = ((target.azDeg - current.azDeg + 540) % 360) - 180;
  return {
    azDeg: (step(current.azDeg, daz, max) + 360) % 360,
    elDeg: step(current.elDeg, target.elDeg - current.elDeg, max),
  };
}
