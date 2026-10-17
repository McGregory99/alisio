// Orbit / pan / zoom (mouse and touch) with bounds: never below terrain, never beyond the maximum distance.
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { constrainCamera, framingPosition, easeInOut, flyDuration, lerp3, followDelta } from './camera-math.mjs';
import { terrainHeight } from './terrain-math.mjs';

export const CAMERA_LIMITS = Object.freeze({ clearance: 6, minDistance: 25, maxDistance: 1400 });

export function createCamera({ THREE, camera, canvas }) {
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
  controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
  controls.screenSpacePanning = false;
  controls.minDistance = CAMERA_LIMITS.minDistance;
  controls.maxDistance = CAMERA_LIMITS.maxDistance;
  controls.maxPolarAngle = 1.5;
  controls.target.set(0, 40, 0);
  camera.position.set(-160, 110, 260);
  controls.update();

  // Fly and follow (R6.2). `getPos` returns the live scene position of the subject.
  let fly = null, tracked = null; // tracked = { getPos, label, last }
  controls.addEventListener('start', () => { fly = null; }); // the user takes over
  addEventListener('keydown', (e) => { if (e.key === 'Escape') tracked = null; });

  return {
    controls,
    /** Animate the camera to frame the subject at `dist`; with `follow` it keeps tracking until `stopFollow`. */
    flyTo(getPos, { dist = 120, follow = false, label = null, durationS = null, dirFrom = null } = {}) {
      const toT0 = getPos();
      // dirFrom: an offset direction to view from (presets); otherwise keep the current viewing direction.
      const from = dirFrom ? { x: toT0.x + dirFrom.x, y: toT0.y + dirFrom.y, z: toT0.z + dirFrom.z } : camera.position;
      const dir = framingPosition(toT0, from, dist);
      fly = { t: 0, dur: durationS ?? flyDuration(Math.hypot(toT0.x - camera.position.x, toT0.y - camera.position.y, toT0.z - camera.position.z)), fromT: controls.target.clone(), fromP: camera.position.clone(), getPos, dist, dir };
      tracked = follow ? { getPos, label, last: null } : null;
    },
    stopFollow() { tracked = null; },
    following: () => tracked?.label ?? null,
    flying: () => fly !== null,
    update(frame) {
      if (fly) {
        fly.t += frame?.dt ?? 0.016;
        const k = easeInOut(fly.t / fly.dur);
        const toT = fly.getPos();
        const toP = framingPosition(toT, fly.dir, fly.dist); // direction fixed at launch, target live
        const t = lerp3(fly.fromT, toT, k), p = lerp3(fly.fromP, toP, k);
        controls.target.set(t.x, t.y, t.z);
        camera.position.set(p.x, p.y, p.z);
        if (fly.t >= fly.dur) { fly = null; if (tracked) tracked.last = { x: toT.x, y: toT.y, z: toT.z }; }
      } else if (tracked) {
        const cur = tracked.getPos();
        const d = followDelta(tracked.last, cur);
        controls.target.x += d.x; controls.target.y += d.y; controls.target.z += d.z;
        camera.position.x += d.x; camera.position.y += d.y; camera.position.z += d.z;
        tracked.last = { x: cur.x, y: cur.y, z: cur.z }; // copy: getPos may return a live, mutated vector
      }
      controls.update();
      const p = constrainCamera(camera.position, controls.target, { heightAt: terrainHeight, ...CAMERA_LIMITS });
      camera.position.set(p.x, p.y, p.z);
    },
  };
}
