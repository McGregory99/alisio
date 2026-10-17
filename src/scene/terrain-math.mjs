// Pure terrain model (no Three.js): arid volcanic south Gran Canaria.
// Frame: x east, -z north, y up, 1 unit = 1 m on campus. Coast distance is compressed for legibility.
export const SEA_LEVEL = 0;
export const COAST_Z = 420; // compressed, illustrative: the sea lies south (+z) of here
export const CAMPUS_RADIUS = 105; // flat platform of the whole fenced campus
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

/** Mountainous backdrop: the island interior rises to the north and along both flanks, far from the campus. */
function mountains(x, z) {
  const north = smooth(-520, -1250, z);
  const flank = smooth(560, 1100, Math.abs(x)) * 0.7 * smooth(380, -250, z);
  const m = Math.max(north, flank);
  if (m <= 0) return 0;
  const r = ridged(x * 0.0045 + 11, z * 0.0045 - 5, 4);
  return m * (45 + 150 * r + 22 * fbm(x * 0.02, z * 0.02, 2)); // rounded volcanic ridges, not alpine spikes
}

/** Ground height in metres at (x, z). Deterministic. */
export function terrainHeight(x, z) {
  const slope = 6 + 0.025 * (COAST_Z - z);
  const rolling = fbm(x * 0.006, z * 0.006) * 16;
  const ravine = smooth(0.52, 0.85, ridged(x * 0.008 + 3, z * 0.005 + 7)) * 14; // barrancos
  const gullies = smooth(0.62, 0.92, ridged(x * 0.022 + 1, z * 0.013 - 9)) * 3.5;
  const d = Math.hypot(x, z);
  const hill = 14 * Math.exp(-(d * d) / (2 * 90 * 90));
  const land = slope + rolling - ravine - gullies + hill + mountains(x, z);
  const withSea = lerp(land, -6, smooth(COAST_Z - 40, COAST_Z + 30, z));
  return lerp(CAMPUS_HEIGHT, withSea, smooth(CAMPUS_RADIUS, CAMPUS_RADIUS + 75, d));
}

const hex2 = (v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0');
const toHex = (c) => `#${hex2(c[0])}${hex2(c[1])}${hex2(c[2])}`;
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mixRgb = (a, b, t) => [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t);

const SAND = rgb('#c9b58a'), WET = rgb('#a89874'), OCHRE_A = rgb('#b8946a'), OCHRE_B = rgb('#a8865f');
const BASALT = rgb('#4b3b34'), TUFF = rgb('#7d5c45'), SCRUB = rgb('#8d8a5f'), HIGH = rgb('#5e4538');

/**
 * Ground colour of a facet. `h` height in m, `ny` the facet normal's y (1 = flat), `n` a 0..1 noise value.
 * Arid volcanic south Gran Canaria: pale sand at the shore, ochre soil on gentle ground, dark basalt on slopes,
 * darker reddish rock high up, sparse dull scrub patches on the lowlands.
 */
export function groundColor({ h, ny, n }) {
  if (h < SEA_LEVEL + 0.7) return toHex(mixRgb(WET, SAND, smooth(-1, 0.7, h)));
  if (h < SEA_LEVEL + 3) return toHex(mixRgb(SAND, n > 0.5 ? OCHRE_A : OCHRE_B, smooth(0.7, 3, h)));
  let c = n > 0.5 ? OCHRE_A : OCHRE_B;
  if (h < 90 && n > 0.78) c = mixRgb(c, SCRUB, 0.55);
  c = mixRgb(c, HIGH, smooth(60, 220, h) * 0.8);
  c = mixRgb(c, TUFF, smooth(0.92, 0.8, ny) * 0.7);
  c = mixRgb(c, BASALT, smooth(0.82, 0.6, ny));
  return toHex(c);
}

function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Deterministic scatter of props (rocks, scrub) on land: [{ x, y, z, s, rot }], outside `exclude`, at least `minLand` m high. */
export function scatterPoints({ seed, count, bounds, heightAt, minLand = 2, exclude = null }) {
  const rnd = mulberry32(seed), out = [];
  for (let i = 0; i < count; i++) {
    const x = lerp(bounds.x0, bounds.x1, rnd()), z = lerp(bounds.z0, bounds.z1, rnd()), s = 0.5 + rnd() * 1.5, rot = rnd() * Math.PI * 2;
    if (exclude && Math.hypot(x - exclude.x, z - exclude.z) < exclude.r) continue;
    const y = heightAt(x, z);
    if (y < minLand) continue;
    out.push({ x, y, z, s, rot });
  }
  return out;
}

/** Surf foam strength at ground height `h` (m): peaks at the waterline, none inland or in deep water. */
export function foamAlpha(h) {
  return Math.max(0, 1 - Math.abs(h + 0.3) / 2.4) * (h > -3 ? 1 : 0) * 0.85 * (h < 2.1 ? 1 : 0);
}

/** Sea colour by depth in m: turquoise shallows to deep blue. */
export function seaDepthTint(depth) {
  return toHex(mixRgb(rgb('#4aa1a3'), rgb('#1d4b66'), smooth(0, 9, depth)));
}
