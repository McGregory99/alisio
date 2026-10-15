// Polar sky plot geometry (R7.3): north up, east right, zenith at the centre, horizon on the rim.
// Uses the same az/el the look-angle function returns, so the marker agrees with the tracker.
/** Offset from the plot centre for an azimuth/elevation (degrees), for a plot of radius `radius`. */
export function polarPoint(azDeg, elDeg, radius) {
  const r = (radius * (90 - elDeg)) / 90;
  const az = (azDeg * Math.PI) / 180;
  return { x: r * Math.sin(az), y: -r * Math.cos(az) };
}

/** Pass samples ({azDeg, elDeg}) at or above the horizon, as plot offsets. */
export const trackPath = (samples, radius) => samples.filter((s) => s.elDeg >= 0).map((s) => polarPoint(s.azDeg, s.elDeg, radius));
