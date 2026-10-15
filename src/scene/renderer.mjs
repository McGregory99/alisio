// Renderer, scene and frame loop. System convention: createX(ctx) -> { update(frame) }.
// ctx = { THREE, scene, camera, renderer, canvas, station }; frame = { simMs, dt, sun: { azDeg, elDeg } }.
import * as THREE from 'three';

export function createWorld({ container, getFrame }) {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'display:block;width:100%;height:100%';
  container.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 1, 6000);
  const systems = [];

  function resize() {
    const w = container.clientWidth || innerWidth, h = container.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  let last = performance.now();
  function loop(t) {
    const dt = Math.min(0.1, (t - last) / 1000);
    last = t;
    const frame = getFrame(dt);
    for (const s of systems) s.update(frame);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }

  return {
    ctx: { THREE, scene, camera, renderer, canvas },
    add(system) { systems.push(system); return system; },
    start() { requestAnimationFrame(loop); },
  };
}
