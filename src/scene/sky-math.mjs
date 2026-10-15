// Pure sky mapping (design 5): a sphere of fixed radius centred on the assigned antenna pivot.
// Satellite positions on it are DIRECTIONS (az/el), not distances. Scene frame: x east, y up, z south-positive.
import { enuFromAzEl } from '../core/geo.mjs';

export const SKY_RADIUS = 320;

/** Scene-frame offset of an ENU vector. */
export const sceneFromEnu = ({ e, n, u }) => ({ x: e, y: u, z: -n });

/** Point on the sky sphere around `centre` in the direction (azDeg from north clockwise, elDeg). */
export function skyPoint(centre, azDeg, elDeg, radius = SKY_RADIUS) {
  const o = sceneFromEnu(enuFromAzEl(azDeg, elDeg, radius));
  return { x: centre.x + o.x, y: centre.y + o.y, z: centre.z + o.z };
}
