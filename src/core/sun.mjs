// Low-precision solar position (Meeus, ~0.01 deg), enough for day/night and sky colour.
const RAD = Math.PI / 180;

/** Sun azimuth (deg from north, clockwise) and elevation (deg) for a Date and a geodetic observer. */
export function sunAzEl(date, { latDeg, lonDeg }) {
  const jd = date.getTime() / 86_400_000 + 2440587.5;
  const n = jd - 2451545.0;
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * RAD;
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
  const eps = (23.439 - 0.0000004 * n) * RAD;
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda));
  const gmst = (280.46061837 + 360.98564736629 * n) % 360;
  const H = (((gmst + lonDeg) * RAD - ra) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
  const lat = latDeg * RAD;
  const el = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H));
  const az = Math.atan2(-Math.cos(dec) * Math.sin(H), Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.sin(lat) * Math.cos(H));
  return { azDeg: (az / RAD + 360) % 360, elDeg: el / RAD };
}
