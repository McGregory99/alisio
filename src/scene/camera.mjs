// Orbit / pan / zoom (mouse and touch) with bounds: never below terrain, never beyond the maximum distance.
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { constrainCamera } from './camera-math.mjs';
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

  return {
    controls,
    update() {
      controls.update();
      const p = constrainCamera(camera.position, controls.target, { heightAt: terrainHeight, ...CAMERA_LIMITS });
      camera.position.set(p.x, p.y, p.z);
    },
  };
}
