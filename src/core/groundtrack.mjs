// Ground track (R7.4): sub-satellite points of a satrec between two times. DOM-free.
import { ecfAt } from './sgp4.mjs';
import { subpoint } from './geo.mjs';

/** @returns {Array<{t:number, latDeg:number, lonDeg:number}>} one point per `stepMs`, both ends included; failed samples skipped */
export function groundTrack(sat, startMs, endMs, stepMs = 60_000) {
  const out = [];
  for (let t = startMs; t <= endMs; t += stepMs) {
    const ecf = ecfAt(sat, new Date(t));
    if (!ecf) continue;
    const { latDeg, lonDeg } = subpoint(ecf);
    out.push({ t, latDeg, lonDeg });
  }
  return out;
}
