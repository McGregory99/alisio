// Pure terrain model (no Three.js): arid volcanic south Gran Canaria.
// Frame: x east, -z north, y up, 1 unit = 1 m on campus. Coast distance is compressed for legibility.
export const SEA_LEVEL = 0;
export const COAST_Z = 420; // compressed, illustrative: the sea lies south (+z) of here
export const CAMPUS_RADIUS = 60;
export const CAMPUS_HEIGHT = 36;

const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function hash2(x, y) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(hash2(xi, yi), hash2(xi + 1, yi), u), lerp(hash2(xi, yi + 1), hash2(xi + 1, yi + 1), u), v);
}
export function fbm(x, y, octaves = 4) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < octaves; i++) { s += a * vnoise(x * f, y * f); f *= 2.03; a *= 0.5; }
  return s;
}
export function ridged(x, y, octaves = 4) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < octaves; i++) { const n = 1 - Math.abs(vnoise(x * f, y * f) * 2 - 1); s += a * n * n; f *= 2.1; a *= 0.5; }
  return s;
}

/** Ground height in metres at (x, z). Deterministic. */
export function terrainHeight(x, z) {
  const slope = 6 + 0.025 * (COAST_Z - z);
  const rolling = fbm(x * 0.006, z * 0.006) * 16;
  const ravine = smooth(0.5, 0.85, ridged(x * 0.008 + 3, z * 0.005 + 7)) * 8;
  const d = Math.hypot(x, z);
  const hill = 14 * Math.exp(-(d * d) / (2 * 90 * 90));
  const land = slope + rolling - ravine + hill;
  const withSea = lerp(land, -6, smooth(COAST_Z - 40, COAST_Z + 30, z));
  return lerp(CAMPUS_HEIGHT, withSea, smooth(CAMPUS_RADIUS, CAMPUS_RADIUS + 50, d));
}
