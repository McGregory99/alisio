// Pure terrain model (no Three.js): arid volcanic south Gran Canaria around the INTA Maspalomas station.
// Frame: x east, -z north, y up, 1 unit = 1 m, sea level y = 0, the station at the origin.
// VERIFIED (see docs/orography.md): the antenna stands ~205 m up (CAMPUS_HEIGHT) and the sea is ~1,750 m away to the
// south (COAST_Z, ESA). Everything else here (barranco positions, slope shape, dune patch, hill shape) is ILLUSTRATIVE.
export const SEA_LEVEL = 0;
export const COAST_Z = 1750; // ESA: the station is about 1,750 m from the coast; the sea lies south (+z)
export const CAMPUS_RADIUS = 130; // flat platform of the whole fenced campus (fence radius 126 m)
export const CAMPUS_HEIGHT = 205; // ESA: 205.1 m above the WGS-84 ellipsoid, used here as height above sea level
export const HILL_HEIGHT = 28; // Montana Blanca: the station platform tops a broad hill (illustrative shape)

const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp01 = (v) => Math.min(1, Math.max(0, v));

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

/** z of the shoreline at x: COAST_Z at x = 0, wandering by a few tens of metres elsewhere (illustrative shape). */
export const shoreZ = (x) => COAST_Z + 35 * (fbm(x * 0.0016 + 9, 3.3, 3) - fbm(9, 3.3, 3));

/**
 * Smooth regional ground without local detail: the platform sits on a hill (HILL_HEIGHT), the ground falls
 * south to sea level at the shoreline (mean slope CAMPUS_HEIGHT / COAST_Z, about 11.7 %) and keeps rising north.
 */
export function baseHeight(x, z) {
  const zc = z - (shoreZ(x) - COAST_Z);
  const d2 = x * x + z * z;
  const rise = zc < 0 ? 0.65 : 1; // north of the station the interior climbs more gently than the shore slope
  return (CAMPUS_HEIGHT - HILL_HEIGHT) * (1 - (rise * zc) / COAST_Z) + HILL_HEIGHT * Math.exp(-d2 / (2 * 300 * 300));
}

/** Barrancos (dry valleys) running north to south to the sea: illustrative positions, believable size. */
export const BARRANCOS = Object.freeze([
  { x0: -700, amp: 45, f: 0.0031, ph: 0.4, width: 62, bed: 12, depth: 20 },
  { x0: 1180, amp: 40, f: 0.0042, ph: 1.9, width: 55, bed: 10, depth: 17 },
  { x0: 2450, amp: 90, f: 0.0025, ph: 3.1, width: 130, bed: 34, depth: 32 }, // the wide one, on the Fataga side
]);
const barrancoAxis = (b, z) => b.x0 + b.amp * Math.sin(z * b.f + b.ph);
const headFade = (z) => smooth(-2800, -1200, z); // valleys begin high in the north
const coastFade = (h) => Math.min(1, Math.max(0, h) / 70); // they shallow out where the ground meets the sea

/** Incision of all barrancos at (x, z) in metres (>= 0), given the regional ground height `base`. */
export function barrancoCut(x, z, base = baseHeight(x, z)) {
  let cut = 0;
  for (const b of BARRANCOS) {
    const dx = Math.abs(x - barrancoAxis(b, z));
    if (dx >= b.width) continue;
    cut += b.depth * (0.6 + 0.4 * smooth(1600, 0, z)) * headFade(z) * (1 - smooth(b.bed, b.width, dx));
  }
  return cut * coastFade(base);
}

/** 0..1: how much of the ground at (x, z) is a dry riverbed (gravel) of a barranco. */
export function barrancoBed(x, z) {
  let m = 0;
  for (const b of BARRANCOS) {
    const dx = Math.abs(x - barrancoAxis(b, z));
    m = Math.max(m, (1 - smooth(b.bed * 0.8, b.bed * 1.4, dx)) * headFade(z));
  }
  return m;
}

/** Pale sand dune field near the coast to the east-south-east (illustrative shape and position), 0..1. */
export const DUNES = Object.freeze({ x: 2600, z: 1560, rx: 950, rz: 260 });
export function duneMask(x, z) {
  const u = ((x - DUNES.x) / DUNES.rx) ** 2 + ((z - DUNES.z) / DUNES.rz) ** 2;
  return 1 - smooth(0.55, 1, u);
}

/** Mountainous backdrop: the island interior rises to the north and along both flanks, far from the campus. */
function mountains(x, z) {
  const north = smooth(-1000, -2200, z);
  const flank = smooth(1500, 2600, Math.abs(x)) * 0.8 * smooth(1200, -400, z);
  const m = Math.max(north, flank);
  if (m <= 0) return 0;
  const r = ridged(x * 0.0045 + 11, z * 0.0045 - 5, 4);
  return m * (45 + 150 * r + 22 * fbm(x * 0.02, z * 0.02, 2)); // rounded volcanic ridges, not alpine spikes
}

/** Ground height in metres at (x, z). Deterministic. */
export function terrainHeight(x, z) {
  const base = baseHeight(x, z);
  const sc = clamp01(base / 80); // local relief fades out towards the shoreline
  const rolling = (fbm(x * 0.0022, z * 0.0022, 3) - 0.5) * 36 * sc;
  const gullies = smooth(0.62, 0.92, ridged(x * 0.011 + 1, z * 0.007 - 9)) * 3 * sc;
  const dunes = duneMask(x, z) * 6 * ridged(x * 0.012, z * 0.02, 3) * smooth(0, 8, base);
  const land = base + rolling - gullies - barrancoCut(x, z, base) + dunes + mountains(x, z);
  const zc = z - (shoreZ(x) - COAST_Z);
  const seaFloor = Math.max(-60, -0.2 - 0.06 * (zc - COAST_Z));
  const withSea = lerp(land, seaFloor, smooth(COAST_Z - 50, COAST_Z + 25, zc));
  const d = Math.hypot(x, z);
  return lerp(CAMPUS_HEIGHT, withSea, smooth(CAMPUS_RADIUS, CAMPUS_RADIUS + 90, d));
}

/** Non-uniform mesh axis from [from, to, step] segments (fine near the campus and the shore, coarse far away). */
export function gridAxis(segments) {
  const out = [segments[0][0]];
  for (const [a, b, step] of segments) {
    const n = Math.round((b - a) / step);
    for (let i = 1; i <= n; i++) out.push(a + ((b - a) * i) / n);
  }
  return out;
}
export const GRID_X = Object.freeze(gridAxis([[-5500, -3500, 250], [-3500, -1500, 100], [-1500, -700, 50], [-700, 700, 10], [700, 1500, 50], [1500, 3500, 100], [3500, 5500, 250]]));
export const GRID_Z = Object.freeze(gridAxis([[-4500, -1500, 250], [-1500, -700, 50], [-700, 700, 10], [700, 1300, 30], [1300, 2300, 20], [2300, 3500, 200]]));

const cellOf = (axis, v) => {
  let lo = 0, hi = axis.length - 2;
  if (v <= axis[0]) return 0;
  if (v >= axis[axis.length - 1]) return hi;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (axis[mid] <= v) lo = mid; else hi = mid - 1; }
  return lo;
};

/**
 * Height of the rendered terrain mesh (the triangulated GRID_X x GRID_Z surface) at (x, z), so things draped on the
 * ground (roads) sit exactly on its facets. Triangles: (i,j)-(i,j+1)-(i+1,j) and (i+1,j)-(i,j+1)-(i+1,j+1).
 * Equals terrainHeight at the mesh nodes.
 */
export function surfaceHeight(x, z, heightAt = terrainHeight) {
  const i = cellOf(GRID_X, x), j = cellOf(GRID_Z, z);
  const x0 = GRID_X[i], x1 = GRID_X[i + 1], z0 = GRID_Z[j], z1 = GRID_Z[j + 1];
  const u = clamp01((x - x0) / (x1 - x0)), v = clamp01((z - z0) / (z1 - z0));
  const h00 = heightAt(x0, z0);
  if (u + v <= 1) return h00 + u * (heightAt(x1, z0) - h00) + v * (heightAt(x0, z1) - h00);
  const h11 = heightAt(x1, z1);
  return h11 + (1 - u) * (heightAt(x0, z1) - h11) + (1 - v) * (heightAt(x1, z0) - h11);
}

const hex2 = (v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0');
const toHex = (c) => `#${hex2(c[0])}${hex2(c[1])}${hex2(c[2])}`;
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mixRgb = (a, b, t) => [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t);

const SAND = rgb('#c9b58a'), WET = rgb('#a89874'), OCHRE_A = rgb('#b8946a'), OCHRE_B = rgb('#a8865f');
const BASALT = rgb('#4b3b34'), TUFF = rgb('#7d5c45'), SCRUB = rgb('#8d8a5f'), HIGH = rgb('#5e4538');
const DUNE_SAND = rgb('#e4d4a8'), GRAVEL = rgb('#b3a58b');

/**
 * Ground colour of a facet. `h` height in m, `ny` the facet normal's y (1 = flat), `n` a 0..1 noise value,
 * `dune` 0..1 dune-field cover, `bed` 0..1 dry riverbed cover.
 * Arid volcanic south Gran Canaria: pale sand at the shore, ochre soil on gentle ground, dark basalt on slopes,
 * darker reddish rock high up, sparse dull scrub patches on the lowlands.
 */
export function groundColor({ h, ny, n, dune = 0, bed = 0 }) {
  const base = groundColorBase({ h, ny, n });
  if (dune <= 0 && bed <= 0) return base;
  let c = rgb(base);
  if (bed > 0 && h > SEA_LEVEL + 1) c = mixRgb(c, GRAVEL, Math.min(1, bed) * 0.8);
  if (dune > 0) c = mixRgb(c, DUNE_SAND, Math.min(1, dune * 1.4));
  return toHex(c);
}
function groundColorBase({ h, ny, n }) {
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
export function scatterPoints({ seed, count, bounds, heightAt, minLand = 2, exclude = null, reject = null }) {
  const rnd = mulberry32(seed), out = [];
  for (let i = 0; i < count; i++) {
    const x = lerp(bounds.x0, bounds.x1, rnd()), z = lerp(bounds.z0, bounds.z1, rnd()), s = 0.5 + rnd() * 1.5, rot = rnd() * Math.PI * 2;
    if (exclude && Math.hypot(x - exclude.x, z - exclude.z) < exclude.r) continue;
    if (reject && reject(x, z)) continue;
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

export const SEA_WAVE_MAX = 0.8; // m, bound of seaWave

/**
 * Swell height offset in m at (x, z) and time t (s): two crossing sine trains, the larger one rolling in from
 * the south-west. Always within +-SEA_WAVE_MAX.
 */
export function seaWave(x, z, t) {
  const a = Math.sin(x * 0.09 + z * 0.06 - t * 1.1);
  const b = Math.sin(x * -0.04 + z * 0.15 - t * 1.6 + 1.7);
  const c = Math.sin(x * 0.2 - z * 0.12 - t * 2.2 + 4.1);
  return SEA_WAVE_MAX * (0.5 * a + 0.32 * b + 0.18 * c);
}
