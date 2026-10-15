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
