// Pure helpers for the illustrative weather effects (no Three.js). Frame: x east, y up, z south-positive.
import { hash2 } from './terrain-math.mjs';

/** Wraps `v` into [min, min + size). */
export const wrap = (v, min, size) => ((((v - min) % size) + size) % size) + min;

/** Trade wind from the north-east, so it blows toward the south-west (unit vector, horizontal). */
export const WIND_DIR = Object.freeze({ x: -Math.SQRT1_2, y: 0, z: Math.SQRT1_2 });

/** Deterministic low cloud layout: a ring above and around the campus, never over the dishes. */
export function cloudLayout(n) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + hash2(i, 7) * 0.9;
    const r = 250 + hash2(i, 11) * 650;
    return {
      x: Math.cos(a) * r, z: Math.sin(a) * r, y: 150 + hash2(i, 13) * 110,
      sx: 90 + hash2(i, 17) * 130, sy: 14 + hash2(i, 19) * 14, sz: 60 + hash2(i, 23) * 90,
    };
  });
}
