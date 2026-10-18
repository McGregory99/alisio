// Direction of the Sun in the ECI (TEME/equatorial) frame from a standard low-precision formula (~0.01 deg),
// the same model as core/sun.mjs. Pure.
const RAD = Math.PI / 180;

/** Unit vector from the Earth towards the Sun: x toward the vernal equinox, z toward the north pole. */
export function sunDirectionEci(date) {
  const n = date.getTime() / 86_400_000 + 2440587.5 - 2451545.0;
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * RAD;
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
  const eps = (23.439 - 0.0000004 * n) * RAD;
  return { x: Math.cos(lambda), y: Math.cos(eps) * Math.sin(lambda), z: Math.sin(eps) * Math.sin(lambda) };
}
