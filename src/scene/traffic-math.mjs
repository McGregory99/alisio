// Pure service-traffic model (no Three.js): slow cars on a closed loop that keep a minimum gap (yield to the car
// ahead) and dwell at stops. Cars: { id, s (m along loop), v (m/s), vmax, wait (s left at a stop), stop (next stop index) }.
export function buildLoop(points) {
  const pts = [...points, points[0]];
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
  return { pts, cum, length: cum[cum.length - 1] };
}

/** Position and heading (yaw, model +z forward) at distance `s` along the loop (wraps). */
export function pointAt(loop, s) {
  const d = ((s % loop.length) + loop.length) % loop.length;
  let i = 1;
  while (i < loop.cum.length - 1 && loop.cum[i] < d) i++;
  const a = loop.pts[i - 1], b = loop.pts[i], seg = loop.cum[i] - loop.cum[i - 1] || 1, k = (d - loop.cum[i - 1]) / seg;
  return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, heading: Math.atan2(b.x - a.x, b.z - a.z) };
}

/** Distance from `from` forward around the loop to `to`. */
export const ringGap = (loop, from, to) => (((to - from) % loop.length) + loop.length) % loop.length;

/**
 * One time step. A car brakes to keep `minGap` to the car ahead (full speed again beyond `headway`), and stops for
 * `dwell` seconds when it reaches the next stop. Returns new car objects.
 */
export function stepTraffic(cars, loop, dt, { headway = 18, minGap = 8, stops = [], accel = 2.5, brake = 7 } = {}) {
  return cars.map((car, idx) => {
    let { s, v, wait = 0, stop = 0 } = car;
    if (wait > 0) return { ...car, wait: Math.max(0, wait - dt), v: 0 };
    let gap = Infinity;
    cars.forEach((o, j) => { if (j !== idx) gap = Math.min(gap, ringGap(loop, s, o.s)); });
    const room = Math.min(1, Math.max(0, (gap - minGap) / (headway - minGap)));
    const target = car.vmax * room;
    v = v < target ? Math.min(target, v + accel * dt) : Math.max(target, v - brake * dt);
    const next = s + v * dt;
    const st = stops[stop % (stops.length || 1)];
    if (st) {
      const before = ringGap(loop, s, st.s), after = ringGap(loop, next, st.s);
      if (before <= v * dt + 1e-9 || (after > before && before < 1)) return { ...car, s: st.s, v: 0, wait: st.dwell, stop: stop + 1 };
    }
    return { ...car, s: next % loop.length, v, wait: 0, stop };
  });
}

/** Distance along a ring loop (built from `ringRoad`, which advances with the polar angle) for a polar angle in radians. */
export const angleToS = (loop, angleRad) => ((((angleRad / (Math.PI * 2)) % 1) + 1) % 1) * loop.length;
