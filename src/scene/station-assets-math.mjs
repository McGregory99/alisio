// Pure geometry parameters for the campus assets (no Three.js). 1 unit = 1 m; heading 0 = north (-z).
const GROUND_PAD = 0.6;

/** Dish proportions scale with diameter, so the 15 m flagship is visibly larger than a 5 m dish. */
export function dimsForAntenna(diameterM) {
  const s = diameterM / 10;
  const pedestalH = 5 * s, armH = 3.2 * s;
  return { s, bowlR: diameterM / 2, pedestalH, armH, pivotH: GROUND_PAD + pedestalH + armH + 0.4 * s };
}

/** Gentle meandering polyline from a campus point toward off-site processing centres. */
export function egressPath(from, headingRad, lengthM, stepM) {
  const dx = Math.sin(headingRad), dz = -Math.cos(headingRad);
  const px = -dz, pz = dx;
  const pts = [];
  for (let d = 0; d <= lengthM; d += stepM) {
    const w = Math.sin(d / 90) * 6 * Math.min(1, d / 120);
    pts.push(d === 0 ? { x: from.x, z: from.z } : { x: from.x + dx * d + px * w, z: from.z + dz * d + pz * w });
  }
  return pts;
}
