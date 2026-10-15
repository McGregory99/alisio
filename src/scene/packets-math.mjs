// Pure helpers for packet flow (no Three.js).

/** Point at fraction `u` (clamped to [0,1]) of the arc length of a polyline of {x,y,z}. */
export function pointOnPolyline(pts, u) {
  if (pts.length === 1) return { ...pts[0] };
  const seg = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y, pts[i].z - pts[i - 1].z);
    seg.push(l); total += l;
  }
  let d = Math.min(1, Math.max(0, u)) * total;
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i] || i === seg.length - 1) {
      const k = seg[i] === 0 ? 0 : Math.min(1, d / seg[i]);
      const a = pts[i], b = pts[i + 1];
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k };
    }
    d -= seg[i];
  }
  return { ...pts[pts.length - 1] };
}

/** `n` evenly spread phases in [0,1) that advance by `speed` per second. */
export function flowFractions(n, tSec, speed) {
  const out = [];
  for (let i = 0; i < n; i++) out.push((((i / n + tSec * speed) % 1) + 1) % 1);
  return out;
}
