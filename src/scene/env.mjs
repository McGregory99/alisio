// Sun-driven environment: light, sky and fog colour, stars at night. Parameters come from env-math.
import { envFromSun } from './env-math.mjs';

export function createEnv({ THREE, scene, renderer }) {
  const hemi = new THREE.HemisphereLight('#bcd4ee', '#6b5a48', 0.6);
  const sun = new THREE.DirectionalLight('#fff3dc', 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -250, right: 250, top: 250, bottom: -250, near: 1, far: 1200 });
  scene.add(hemi, sun, sun.target);
  scene.background = new THREE.Color('#8fb8d8');
  scene.fog = new THREE.Fog('#8fb8d8', 500, 2600);

  const pts = new Float32Array(900);
  for (let i = 0; i < 300; i++) {
    const a = Math.acos(1 - Math.random() * 0.95), b = Math.random() * Math.PI * 2, r = 4500;
    pts.set([r * Math.sin(a) * Math.cos(b), r * Math.cos(a), r * Math.sin(a) * Math.sin(b)], i * 3);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  const starMat = new THREE.PointsMaterial({ color: '#ffffff', size: 6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
  const stars = new THREE.Points(sg, starMat);
  scene.add(stars);

  return {
    update({ sun: s }) {
      const e = envFromSun(s.elDeg);
      const az = (s.azDeg * Math.PI) / 180, el = (Math.max(s.elDeg, 2) * Math.PI) / 180;
      sun.position.set(Math.cos(el) * Math.sin(az), Math.sin(el), -Math.cos(el) * Math.cos(az)).multiplyScalar(800);
      sun.intensity = e.sunIntensity;
      hemi.intensity = e.ambient;
      scene.background.set(e.skyHex);
      scene.fog.color.set(e.fogHex);
      starMat.opacity = e.starOpacity;
      renderer.toneMappingExposure = 0.9 + 0.3 * (e.sunIntensity / 2.4);
    },
  };
}
