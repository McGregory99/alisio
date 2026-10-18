// Hidden debug page (?models=1): the five Sentinel models side by side on a plain background, in metres.
// Options: &only=S1|S2|S3|S5P|S6  &view=iso|nadir|top|side|front  &spin=1 (slow turntable)
import * as THREE from 'three';
import { createSentinelModel } from './sentinel-models.mjs';
import { FAMILIES, SENTINEL_SPECS } from './sentinel-spec.mjs';

const VIEWS = {
  iso: [0.75, 0.55, 1],
  nadir: [0.0, -1, 0.01], // looking up at the nadir face from below
  top: [0, 1, 0.01],
  side: [1, 0.05, 0],
  front: [0, 0.05, 1],
};

export function runInspector(container = document.body, search = location.search) {
  const q = new URLSearchParams(search);
  const only = q.get('only');
  const families = only && FAMILIES.includes(only) ? [only] : FAMILIES;
  const dir = new THREE.Vector3(...(VIEWS[q.get('view')] ?? VIEWS.iso)).normalize();

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:9999;display:block;background:#202530';
  container.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#202530');
  scene.add(new THREE.HemisphereLight('#dfe8ff', '#30343c', 1.1));
  const sun = new THREE.DirectionalLight('#ffffff', 2.4);
  sun.position.set(30, 40, 25);
  scene.add(sun);
  const fill = new THREE.DirectionalLight('#9fbcff', 2.2);
  fill.position.set(-20, -40, 15);
  scene.add(fill);

  const spacing = families.length === 1 ? 0 : 15;
  const holders = families.map((f, i) => {
    const holder = new THREE.Group();
    holder.add(createSentinelModel(THREE, f));
    holder.position.x = (i - (families.length - 1) / 2) * spacing;
    scene.add(holder);
    return holder;
  });

  const centres = holders.map((h) => new THREE.Box3().setFromObject(h).getCenter(new THREE.Vector3()));
  const target = centres.reduce((a, c) => a.add(c), new THREE.Vector3()).divideScalar(centres.length); // frame the volume, not the origin
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 500);
  const span = families.length === 1 ? Math.max(...families.map((f) => SENTINEL_SPECS[f].maxExtent)) * 1.05 : spacing * families.length * 0.62;
  const place = () => { camera.position.copy(dir).multiplyScalar(span / (Math.tan((camera.fov * Math.PI) / 360) * Math.min(1, camera.aspect)) / 2 * 1.1).add(target); camera.lookAt(target); };
  const resize = () => {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    place();
  };
  addEventListener('resize', resize);
  resize();
  const spin = q.get('spin') === '1';
  const loop = () => {
    if (spin) for (const h of holders) h.rotation.y += 0.005;
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  };
  loop();
  return { scene, camera, renderer };
}
