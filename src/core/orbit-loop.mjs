// One orbital period of a satellite as a closed ECI loop. DOM-free; propagation goes through sgp4.mjs.
import { propagateAt, periodMinutes } from './sgp4.mjs';

/**
 * @param {object} sat from `toSatrec`
 * @param {number} startMs simulated time of the first sample
 * @param {number} n samples over one period (the loop closes from the last sample back to the first)
 * @returns {{points: Float32Array, periodMin: number}|null} ECI km, xyz interleaved; null when propagation fails
 */
export function orbitLoopEci(sat, startMs, n = 150) {
  const periodMin = periodMinutes(sat);
  if (!periodMin) return null;
  const points = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const pv = propagateAt(sat, new Date(startMs + (i * periodMin * 60_000) / n));
    if (!pv) return null;
    points[i * 3] = pv.position.x; points[i * 3 + 1] = pv.position.y; points[i * 3 + 2] = pv.position.z;
  }
  return { points, periodMin };
}
