// The only module that imports the vendored satellite.js. Builds satrecs from OMM JSON (not TLE),
// so NORAD IDs beyond 5 digits (e.g. Sentinel-3C, 100690) work.
import { json2satrec, propagate, gstime, eciToEcf } from '../../vendor/satellite.js-7.1.0/dist/index.js';

/**
 * @param {object} omm CelesTrak OMM JSON record
 * @returns {{satrec: object|null, failed: boolean, norad: number, reason?: string}}
 */
export function toSatrec(omm) {
  const norad = omm?.NORAD_CAT_ID;
  try {
    const satrec = json2satrec(omm);
    if (satrec.error !== 0) return { satrec, failed: true, norad, reason: `satrec.error=${satrec.error}` };
    return { satrec, failed: false, norad };
  } catch (e) {
    return { satrec: null, failed: true, norad, reason: String(e?.message ?? e) };
  }
}

/** ECI position/velocity (km, km/s) at `date`, or null when the satellite failed or propagation errors. */
export function propagateAt(sat, date) {
  if (!sat || sat.failed) return null;
  const pv = propagate(sat.satrec, date);
  if (!pv || !pv.position || typeof pv.position.x !== 'number' || Number.isNaN(pv.position.x)) return null;
  return pv;
}

/** Earth-fixed (ECF) position in km at `date`, or null. */
export function ecfAt(sat, date) {
  const pv = propagateAt(sat, date);
  return pv ? eciToEcf(pv.position, gstime(date)) : null;
}

/** Greenwich mean sidereal time in radians at `date` (rotation of the Earth-fixed frame against ECI). */
export const gmstRad = (date) => gstime(date);

/** Orbital period in minutes from the mean motion of a satrec (from `toSatrec`), or null. */
export function periodMinutes(sat) {
  const no = sat?.satrec?.no; // rad/min
  return typeof no === 'number' && no > 0 ? (2 * Math.PI) / no : null;
}
