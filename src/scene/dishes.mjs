// Dishes (R5.4 visual): each antenna follows the target from core/pointing, rate-limited in simulation time,
// and parks at zenith when idle. The scene only applies the az/el produced by the pure functions.
import { dishRotation, advanceDish } from './dishes-math.mjs';
import { STOW } from '../core/pointing.mjs';

export function createDishes({ station, assets }) {
  const antennas = new Map(station.antennas.map((a) => [a.id, a]));
  const states = new Map(); // antenna id -> { azDeg, elDeg, mode }
  for (const id of assets.dishes.keys()) states.set(id, { azDeg: STOW.azDeg, elDeg: STOW.elDeg, mode: 'stow' });
  let lastSim = null;

  return {
    states,
    update({ simMs, schedule }) {
      const dt = lastSim == null ? 0 : simMs - lastSim;
      lastSim = simMs;
      for (const [id, dish] of assets.dishes) {
        const next = advanceDish(states.get(id), { lane: schedule.lanes.get(id) ?? null, antenna: antennas.get(id), observer: station.location }, simMs, dt);
        states.set(id, { azDeg: next.azDeg, elDeg: next.elDeg, mode: next.mode });
        const r = dishRotation(next.azDeg, next.elDeg);
        dish.azG.rotation.y = r.yRad;
        dish.elG.rotation.x = r.xRad;
      }
    },
  };
}
