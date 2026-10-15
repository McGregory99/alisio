// Pass search. Times are epoch milliseconds; angles degrees; ranges km.
// Method: 60 s coarse scan of (elevation - mask), 0.5 s bisection for AOS/LOS, golden-section for TCA,
// a near-mask peak check for passes shorter than the scan step, and a back-scan when the window starts inside a pass.
import { geoLookAngles } from './geo.mjs';

const STEP_MS = 60_000;
const TOL_MS = 500;
const BACKSCAN_LIMIT_MS = 3_600_000;
const PHI = (Math.sqrt(5) - 1) / 2;

const elAt = (sat, observer, t) => geoLookAngles(observer, sat, new Date(t))?.elDeg ?? -Infinity;

/** Time in (lo, hi] where f crosses zero, given f(lo) <= 0 < f(hi) when rising (or reversed when falling). */
function bisect(f, lo, hi, rising) {
  while (hi - lo > TOL_MS) {
    const mid = (lo + hi) / 2;
    if (f(mid) > 0 === rising) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

function goldenMax(f, lo, hi) {
  let a = lo, b = hi;
  let c = b - PHI * (b - a), d = a + PHI * (b - a);
  let fc = f(c), fd = f(d);
  while (b - a > TOL_MS) {
    if (fc > fd) { b = d; d = c; fd = fc; c = b - PHI * (b - a); fc = f(c); }
    else { a = c; c = d; fc = fd; d = a + PHI * (b - a); fd = f(d); }
  }
  return (a + b) / 2;
}

/**
 * @param {{sat: object, observer: {latDeg:number,lonDeg:number,altM:number}, startMs: number, endMs: number, maskDeg?: number}} opts
 *   `sat` comes from toSatrec; `maskDeg` accepts the station default or an antenna override.
 * @returns {Array<{id: string, norad: number, aos: number, tca: number, los: number, maxElDeg: number, aosAzDeg: number, losAzDeg: number}>}
 */
export function findPasses({ sat, observer, startMs, endMs, maskDeg = 5 }) {
  if (!sat || sat.failed) return [];
  const f = (t) => elAt(sat, observer, t) - maskDeg;
  const out = [];

  const push = (aos, los) => {
    const tca = goldenMax(f, aos, los);
    const maxElDeg = f(tca) + maskDeg;
    const az = (t) => geoLookAngles(observer, sat, new Date(t)).azDeg;
    out.push({ id: `${sat.norad}-${Math.round(aos / 1000)}`, norad: sat.norad, aos, tca, los, maxElDeg, aosAzDeg: az(aos), losAzDeg: az(los) });
  };
  const findLos = (from) => {
    let t = from;
    while (f(t) > 0) t += STEP_MS;
    return bisect(f, t - STEP_MS, t, false);
  };

  let t = startMs;
  let prev = f(t), prev2 = -Infinity, tPrev2 = t;
  if (prev > 0) {
    let b = t;
    while (f(b) > 0 && t - b < BACKSCAN_LIMIT_MS) b -= STEP_MS;
    const aos = bisect(f, b, b + STEP_MS, true);
    const los = findLos(t);
    push(aos, los);
    t = los;
    prev = f(t);
  }
  while (t < endMs) {
    const next = t + STEP_MS;
    const cur = f(next);
    if (prev <= 0 && cur > 0) {
      const aos = bisect(f, t, next, true);
      const los = findLos(next);
      push(aos, los);
      t = los; prev = f(t); prev2 = -Infinity; tPrev2 = t;
      continue;
    }
    // Near-mask peak: a local maximum below the mask that may still poke above it between samples.
    if (prev2 < prev && prev > cur && prev <= 0 && prev > -2) {
      const peak = goldenMax(f, tPrev2, next);
      if (f(peak) > 0) {
        push(bisect(f, tPrev2, peak, true), bisect(f, peak, next, false));
      }
    }
    prev2 = prev; tPrev2 = t; prev = cur; t = next;
  }
  return out;
}

/** Az/el/range samples from AOS to LOS every `stepS` seconds (inclusive of both ends). */
export function sampleTrack(sat, observer, aosMs, losMs, stepS = 10) {
  const track = [];
  for (let t = aosMs; t < losMs + stepS * 1000; t += stepS * 1000) {
    const time = Math.min(t, losMs);
    track.push({ t: time, ...geoLookAngles(observer, sat, new Date(time)) });
    if (time === losMs) break;
  }
  return track;
}
