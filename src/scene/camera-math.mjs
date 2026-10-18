// Pure camera bounds (no Three.js): keep the camera above the terrain and within a maximum distance.
/**
 * @param {{x:number,y:number,z:number}} pos camera position
 * @param {{x:number,y:number,z:number}} target orbit target
 * @param {{heightAt:(x:number,z:number)=>number, clearance:number, maxDistance:number}} o
 */
export function constrainCamera(pos, target, { heightAt, clearance, maxDistance }) {
  let { x, y, z } = pos;
  const dx = x - target.x, dy = y - target.y, dz = z - target.z;
  const dist = Math.hypot(dx, dy, dz);
  if (dist > maxDistance) {
    const k = maxDistance / dist;
    x = target.x + dx * k; y = target.y + dy * k; z = target.z + dz * k;
  }
  const floor = heightAt(x, z) + clearance;
  if (y < floor) y = floor;
  return { x, y, z };
}

/** Camera position at `dist` from `target`, keeping the direction from the target to `camPos`. */
export function framingPosition(target, camPos, dist) {
  let dx = camPos.x - target.x, dy = camPos.y - target.y, dz = camPos.z - target.z;
  let len = Math.hypot(dx, dy, dz);
  if (len < 1e-9) { dx = 1; dy = 0.6; dz = 1; len = Math.hypot(dx, dy, dz); }
  const k = dist / len;
  return { x: target.x + dx * k, y: target.y + dy * k, z: target.z + dz * k };
}

/**
 * Pointer scheme of the camera. Free: left drag pans, right drag rotates. Locked on a selected object: the object
 * stays at the centre, left drag (or one finger) rotates around it and panning is off; the minimum distance drops so
 * a small object can be viewed up close.
 */
export const interactionScheme = (locked, { freeMin, lockedMin }) => (locked
  ? { left: 'rotate', oneTouch: 'rotate', pan: false, minDistance: lockedMin }
  : { left: 'pan', oneTouch: 'pan', pan: true, minDistance: freeMin });

export const smoothstep = (k) => { const c = Math.min(1, Math.max(0, k)); return c * c * (3 - 2 * c); };

export const lerp3 = (a, b, k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k });

/** Movement of a followed point between two frames (zero when there is no previous point). */
export const followDelta = (prev, cur) => (prev ? { x: cur.x - prev.x, y: cur.y - prev.y, z: cur.z - prev.z } : { x: 0, y: 0, z: 0 });

/** Fly time in seconds from the travelled distance (m): quick for hops, slower for long flights. */
export const flyDuration = (distM) => Math.min(2.6, 0.9 + Math.max(0, distM) / 900);

/** Quintic in-out easing for camera flights (gentler start and stop than smoothstep). */
export const easeInOut = (k) => { const c = Math.min(1, Math.max(0, k)); return c < 0.5 ? 16 * c ** 5 : 1 - ((-2 * c + 2) ** 5) / 2; };
