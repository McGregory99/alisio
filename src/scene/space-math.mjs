// Pure geometry for the 3D space view (no Three.js, no DOM). Units: kilometres, degrees.
// Scene frame: Earth centre at the origin, +y towards the north pole, ECI x -> scene x, ECI z -> scene y, ECI y -> scene -z
// (a proper rotation, so handedness is kept). The Earth mesh is spun about +y by GMST, so Earth-fixed
// longitude 0 sits on +x when GMST is zero and inertial (ECI) orbits stay put.
export const EARTH_RADIUS_KM = 6371;
const RAD = Math.PI / 180;

/** Latitude/longitude (deg) on a sphere of radius `r` in the Earth-fixed scene frame (before the GMST spin). */
export function latLonToXyz(latDeg, lonDeg, r = EARTH_RADIUS_KM) {
  const lat = latDeg * RAD, lon = lonDeg * RAD;
  return { x: r * Math.cos(lat) * Math.cos(lon), y: r * Math.sin(lat), z: -r * Math.cos(lat) * Math.sin(lon) };
}

/** ECI (x toward the vernal equinox, z north) to the scene frame. */
export const eciToScene = (p) => ({ x: p.x, y: p.z, z: -p.y });

/** Position in the scene frame of an Earth-fixed point once the Earth has turned by `gmstRad`. */
export function rotateAboutY(p, angleRad) {
  const c = Math.cos(angleRad), s = Math.sin(angleRad);
  return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c };
}

/** Equirectangular canvas position of a lon/lat (deg); longitude -180 is the left edge, latitude +90 the top. */
export const equirect = (lonDeg, latDeg, w, h) => ({ x: ((lonDeg + 180) / 360) * w, y: ((90 - latDeg) / 180) * h });

/** Douglas-Peucker simplification of a closed ring of [lon, lat] (the closing duplicate point is not required). */
export function simplifyRing(ring, tolDeg) {
  const pts = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1] ? ring.slice(0, -1) : ring.slice();
  if (pts.length <= 3) return pts;
  // Anchor the first point and the point farthest from it, simplify the two halves.
  let far = 1, best = -1;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]);
    if (d > best) { best = d; far = i; }
  }
  const a = dp(pts.slice(0, far + 1), tolDeg), b = dp(pts.slice(far).concat([pts[0]]), tolDeg);
  return a.slice(0, -1).concat(b.slice(0, -1));
}

function dp(pts, tol) {
  if (pts.length < 3) return pts;
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
  const len = Math.hypot(bx - ax, by - ay);
  let idx = -1, max = tol;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i];
    const d = len === 0 ? Math.hypot(px - ax, py - ay) : Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / len;
    if (d > max) { max = d; idx = i; }
  }
  if (idx < 0) return [pts[0], pts[pts.length - 1]];
  return dp(pts.slice(0, idx + 1), tol).slice(0, -1).concat(dp(pts.slice(idx), tol));
}

/** Unsigned area of a [lon, lat] ring in square degrees (shoelace). */
export function ringAreaDeg2(ring) {
  let s = 0;
  for (let i = 0; i < ring.length; i++) { const [x1, y1] = ring[i], [x2, y2] = ring[(i + 1) % ring.length]; s += x1 * y2 - x2 * y1; }
  return Math.abs(s) / 2;
}

/** Graticule as polylines of {latDeg, lonDeg}: meridians and parallels every `stepDeg`, sampled every `sampleDeg`. */
export function graticule(stepDeg = 30, sampleDeg = 5) {
  const lines = [];
  for (let lon = -180; lon < 180; lon += stepDeg) {
    const l = [];
    for (let lat = -90; lat <= 90; lat += sampleDeg) l.push({ latDeg: lat, lonDeg: lon });
    lines.push(l);
  }
  for (let lat = -90 + stepDeg; lat < 90; lat += stepDeg) {
    const l = [];
    for (let lon = -180; lon <= 180; lon += sampleDeg) l.push({ latDeg: lat, lonDeg: lon });
    lines.push(l);
  }
  return lines;
}

/** Point `distDeg` of arc away from `from` along `bearingDeg` (clockwise from north). */
export function destination(from, bearingDeg, distDeg) {
  const lat1 = from.latDeg * RAD, lon1 = from.lonDeg * RAD, b = bearingDeg * RAD, d = distDeg * RAD;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b));
  const lon2 = lon1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return { latDeg: lat2 / RAD, lonDeg: ((lon2 / RAD + 540) % 360) - 180 };
}

/** Great-circle radius (deg) of the area where something at `altKm` is above `maskDeg` elevation. */
export function footprintRadiusDeg(altKm, maskDeg, earthKm = EARTH_RADIUS_KM) {
  const el = maskDeg * RAD;
  return (Math.acos((earthKm * Math.cos(el)) / (earthKm + altKm)) - el) / RAD;
}

/** Ring of {latDeg, lonDeg} at angular radius `radiusDeg` around `centre`. */
export function circleOnSphere(centre, radiusDeg, n = 72) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(destination(centre, (360 * i) / n, radiusDeg));
  return out;
}

/** True when the segment from `cam` to `pt` passes through the sphere of radius `r` at the origin (point hidden by the Earth). */
export function occludedBySphere(cam, pt, r = EARTH_RADIUS_KM) {
  const dx = pt.x - cam.x, dy = pt.y - cam.y, dz = pt.z - cam.z;
  const a = dx * dx + dy * dy + dz * dz;
  if (a === 0) return false;
  const b = 2 * (cam.x * dx + cam.y * dy + cam.z * dz);
  const c = cam.x * cam.x + cam.y * cam.y + cam.z * cam.z - r * r;
  const disc = b * b - 4 * a * c;
  if (disc <= 0) return false;
  const t = (-b - Math.sqrt(disc)) / (2 * a); // first crossing
  return t > 0 && t < 1;
}

/** Index of the screen point nearest to (px, py) within `maxPx`, or -1. Entries may be null (not shown). */
export function nearestScreenPoint(points, px, py, maxPx) {
  let best = -1, bestD = maxPx;
  points.forEach((p, i) => {
    if (!p) return;
    const d = Math.hypot(p.x - px, p.y - py);
    if (d <= bestD) { best = i; bestD = d; }
  });
  return best;
}

/** Orbits are rebuilt when the records change or the simulated clock moved more than `intervalMs` from the last build. */
export const shouldRebuildOrbits = ({ lastBuildMs, nowMs, sameRecords, intervalMs = 600_000 }) =>
  lastBuildMs == null || !sameRecords || Math.abs(nowMs - lastBuildMs) > intervalMs;

/** Deterministic pseudo-random star directions (unit vectors) with a brightness 0.35..1. */
export function starField(n, seed = 7) {
  let s = seed >>> 0;
  const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const out = [];
  for (let i = 0; i < n; i++) {
    const z = rnd() * 2 - 1, a = rnd() * Math.PI * 2, r = Math.sqrt(1 - z * z);
    out.push({ x: r * Math.cos(a), y: z, z: r * Math.sin(a), b: 0.35 + 0.65 * rnd() ** 2 });
  }
  return out;
}
