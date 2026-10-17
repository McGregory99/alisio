// Orthographic projection for the mini globe (R7.4). North is up, east is right, `centre` sits at the origin.
const RAD = Math.PI / 180;

/** Offset from the globe centre in a globe of radius `radius`; `visible` is false on the far side. */
export function project(latDeg, lonDeg, centre, radius) {
  const lat = latDeg * RAD, dlon = (lonDeg - centre.lonDeg) * RAD, lat0 = centre.latDeg * RAD;
  const cosc = Math.sin(lat0) * Math.sin(lat) + Math.cos(lat0) * Math.cos(lat) * Math.cos(dlon);
  return {
    x: radius * Math.cos(lat) * Math.sin(dlon),
    y: -radius * (Math.cos(lat0) * Math.sin(lat) - Math.sin(lat0) * Math.cos(lat) * Math.cos(dlon)),
    visible: cosc >= 0,
  };
}

/** Split a track into runs of consecutive visible points, so lines never cross behind the globe. */
export function visibleRuns(points, centre, radius) {
  const runs = [];
  let run = [];
  for (const p of points) {
    const q = project(p.latDeg, p.lonDeg, centre, radius);
    if (q.visible) run.push(q);
    else if (run.length) { runs.push(run); run = []; }
  }
  if (run.length) runs.push(run);
  return runs;
}

const EARTH_RADIUS_KM = 6378.137;
const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Latitude and longitude (deg) of the point where the sun is at the zenith; same low-precision model as core/sun. */
export function sunSubpoint(date) {
  const n = date.getTime() / 86_400_000 + 2440587.5 - 2451545.0;
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * RAD;
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
  const eps = (23.439 - 0.0000004 * n) * RAD;
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda)) / RAD;
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda)) / RAD;
  const gmst = (280.46061837 + 360.98564736629 * n) % 360;
  const lon = ((ra - gmst) % 360 + 540) % 360 - 180;
  return { latDeg: dec, lonDeg: lon };
}

/** Night shading 0 (full day) .. 1 (full night) at a surface point, soft across the terminator. */
export function nightAlpha(latDeg, lonDeg, sun) {
  const lat = latDeg * RAD, dlon = (lonDeg - sun.lonDeg) * RAD, d = sun.latDeg * RAD;
  const dot = Math.sin(lat) * Math.sin(d) + Math.cos(lat) * Math.cos(d) * Math.cos(dlon);
  return 1 - smoothstep(-0.18, 0.18, dot);
}

/** Great-circle radius (deg) of the area where a satellite at `altKm` is above `maskDeg` elevation. */
export function footprintRadiusDeg(altKm, maskDeg) {
  const el = maskDeg * RAD;
  return (Math.acos((EARTH_RADIUS_KM * Math.cos(el)) / (EARTH_RADIUS_KM + altKm)) - el) / RAD;
}

/** Inverse of `project` for the visible disc: lat/lon under an offset (x east, y south) or null outside the disc. */
export function unproject(x, y, centre, radius) {
  const px = x / radius, py = -y / radius, rho = Math.hypot(px, py);
  if (rho > 1) return null;
  const c = Math.asin(rho), lat0 = centre.latDeg * RAD;
  if (rho === 0) return { latDeg: centre.latDeg, lonDeg: centre.lonDeg };
  const lat = Math.asin(Math.cos(c) * Math.sin(lat0) + (py * Math.sin(c) * Math.cos(lat0)) / rho);
  const lon = centre.lonDeg * RAD + Math.atan2(px * Math.sin(c), rho * Math.cos(lat0) * Math.cos(c) - py * Math.sin(lat0) * Math.sin(c));
  return { latDeg: lat / RAD, lonDeg: ((lon / RAD + 540) % 360) - 180 };
}

/** Point `distDeg` of arc away from `from` along `bearingDeg` (clockwise from north), on a sphere. */
export function destination(from, bearingDeg, distDeg) {
  const lat1 = from.latDeg * RAD, lon1 = from.lonDeg * RAD, b = bearingDeg * RAD, d = distDeg * RAD;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b));
  const lon2 = lon1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return { latDeg: lat2 / RAD, lonDeg: ((lon2 / RAD + 540) % 360) - 180 };
}
