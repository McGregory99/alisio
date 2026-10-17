// Pure campus layout helpers (no Three.js): ring road, service spurs, cable runs, fence posts and ribbon geometry.
// Scene frame: x east, y up, z south-positive; 1 unit = 1 m. All of it is an illustrative placeholder layout.
export const RING_R = 112; // service ring road around the campus
export const FENCE_R = 126; // perimeter fence
export const GATE = Object.freeze({ angleRad: Math.PI / 2, widthM: 16 }); // south side, towards the coast

/** Closed ring of `n` points at radius `r`. */
export function ringRoad(r, n) {
  return Array.from({ length: n }, (_, i) => ({ x: Math.cos((i / n) * Math.PI * 2) * r, z: Math.sin((i / n) * Math.PI * 2) * r }));
}

/** Straight service road from a campus point outwards (radially) to the ring; the centre heads to the south gate. */
export function spurTo(from, ringR) {
  const d = Math.hypot(from.x, from.z);
  const ux = d < 1e-6 ? 0 : from.x / d, uz = d < 1e-6 ? 1 : from.z / d;
  return [{ x: from.x, z: from.z }, { x: ux * ringR, z: uz * ringR }];
}

export function polylineLength(pts) {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
  return s;
}

/** Subdivide a polyline so consecutive points are at most `step` apart (end points kept). */
export function resample(pts, step) {
  const out = [{ ...pts[0] }];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / step));
    for (let k = 1; k <= n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, z: a.z + ((b.z - a.z) * k) / n });
  }
  return out;
}

/** Flat ribbon along a polyline: [left, right] vertex pairs per point (x/z only) and triangle indices. */
export function ribbonXZ(pts, half) {
  const verts = [], indices = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let tx = b.x - a.x, tz = b.z - a.z;
    const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
    verts.push({ x: pts[i].x - tz * half, z: pts[i].z + tx * half }, { x: pts[i].x + tz * half, z: pts[i].z - tx * half });
    if (i > 0) { const k = (i - 1) * 2; indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  return { verts, indices };
}

/** Fence posts every `spacing` m on radius `r`, skipping the gate opening. */
export function fencePosts(r, spacing, gate = GATE) {
  const n = Math.round((2 * Math.PI * r) / spacing), out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x - Math.cos(gate.angleRad) * r, z - Math.sin(gate.angleRad) * r) < gate.widthM / 2) continue;
    out.push({ x, z });
  }
  return out;
}

/** Cable trench run: along x first, then along z. */
export function lShapedRun(a, b) {
  return [{ x: a.x, z: a.z }, { x: b.x, z: a.z }, { x: b.x, z: b.z }];
}
