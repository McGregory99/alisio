// Geometry on WGS84. Units: degrees for angles, kilometres for ranges and ECF coordinates,
// metres only for the geodetic altitude carried by station data (`altM`).
//
// Reference point (A5): look angles are computed from the station geodetic origin taken from
// station data. Dish pointing in the scene uses each antenna's elevation pivot instead.
import { ecfAt } from './sgp4.mjs';

const A_KM = 6378.137;
const F = 1 / 298.257223563;
const E2 = F * (2 - F);
const RAD = Math.PI / 180;

/** Geodetic {latDeg, lonDeg, altM} to ECF km. */
export function observerEcf({ latDeg, lonDeg, altM }) {
  const lat = latDeg * RAD, lon = lonDeg * RAD, h = altM / 1000;
  const n = A_KM / Math.sqrt(1 - E2 * Math.sin(lat) ** 2);
  return {
    x: (n + h) * Math.cos(lat) * Math.cos(lon),
    y: (n + h) * Math.cos(lat) * Math.sin(lon),
    z: (n * (1 - E2) + h) * Math.sin(lat),
  };
}

/** Azimuth (deg, from north, clockwise), elevation (deg) and range (km) of an ECF point seen from `observer`. */
export function lookAngles(observer, ecf) {
  const o = observerEcf(observer);
  const dx = ecf.x - o.x, dy = ecf.y - o.y, dz = ecf.z - o.z;
  const lat = observer.latDeg * RAD, lon = observer.lonDeg * RAD;
  const e = -Math.sin(lon) * dx + Math.cos(lon) * dy;
  const n = -Math.sin(lat) * Math.cos(lon) * dx - Math.sin(lat) * Math.sin(lon) * dy + Math.cos(lat) * dz;
  const u = Math.cos(lat) * Math.cos(lon) * dx + Math.cos(lat) * Math.sin(lon) * dy + Math.sin(lat) * dz;
  const rangeKm = Math.hypot(e, n, u);
  return {
    azDeg: (Math.atan2(e, n) / RAD + 360) % 360,
    elDeg: Math.asin(u / rangeKm) / RAD,
    rangeKm,
  };
}

/** Unit-length (scaled by `r`) east/north/up vector for an azimuth/elevation pair. */
export function enuFromAzEl(azDeg, elDeg, r = 1) {
  const az = azDeg * RAD, el = elDeg * RAD;
  return { e: r * Math.cos(el) * Math.sin(az), n: r * Math.cos(el) * Math.cos(az), u: r * Math.sin(el) };
}

/** Sub-satellite point of an ECF position: {latDeg, lonDeg, altKm}. */
export function subpoint(ecf) {
  const p = Math.hypot(ecf.x, ecf.y);
  let lat = Math.atan2(ecf.z, p * (1 - E2));
  let h = 0;
  for (let i = 0; i < 6; i++) {
    const n = A_KM / Math.sqrt(1 - E2 * Math.sin(lat) ** 2);
    h = p / Math.cos(lat) - n;
    lat = Math.atan2(ecf.z, p * (1 - (E2 * n) / (n + h)));
  }
  return { latDeg: lat / RAD, lonDeg: Math.atan2(ecf.y, ecf.x) / RAD, altKm: h };
}

/** Look angles of a satrec (from `toSatrec`) at `date`, or null when propagation fails. */
export function geoLookAngles(observer, sat, date) {
  const ecf = ecfAt(sat, date);
  return ecf ? lookAngles(observer, ecf) : null;
}
