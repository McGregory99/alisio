// Pure dish kinematics for the scene (no Three.js). The dish model's bowl faces +z of its elevation group;
// stowed it points at zenith. Scene frame: x east, y up, z south-positive.
import { dishTarget, slewStep } from '../core/pointing.mjs';

const RAD = Math.PI / 180;

/** Euler angles for the model: `yRad` turns the azimuth group, `xRad` tilts the elevation group. */
export function dishRotation(azDeg, elDeg) {
  return { yRad: (180 - azDeg) * RAD, xRad: -elDeg * RAD };
}

/** Boresight unit vector of a rotation (azimuth yaw applied after elevation tilt). */
export function boresight({ yRad, xRad }) {
  return { x: Math.cos(xRad) * Math.sin(yRad), y: -Math.sin(xRad), z: Math.cos(xRad) * Math.cos(yRad) };
}

/**
 * One kinematic step in simulation time.
 * @param {{azDeg:number, elDeg:number}} current
 * @param {{lane: object|null, antenna: object, observer: object}} c lane = schedule lane for this antenna
 * @param {number} simMs simulation time
 * @param {number} dtSimMs elapsed simulation time since the previous step; zero or negative holds position
 */
export function advanceDish(current, { lane, antenna, observer }, simMs, dtSimMs) {
  const target = dishTarget(lane?.pass ?? null, simMs, antenna, { sat: lane?.sat, observer });
  if (!(dtSimMs > 0)) return { azDeg: current.azDeg, elDeg: current.elDeg, mode: target.mode, target };
  const next = slewStep(current, target, antenna.slewDegS, dtSimMs / 1000);
  return { ...next, mode: target.mode, target };
}
