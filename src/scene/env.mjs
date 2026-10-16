// Sun-driven environment: light, sky and fog colour, stars at night. Parameters come from env-math.
import { envFromSun, weatherEnv } from './env-math.mjs';
import { weatherEffects } from '../core/weather.mjs';

export function createEnv({ THREE, scene, renderer, weather }) {
  const hemi = new THREE.HemisphereLight('#bcd4ee', '#6b5a48', 0.6);
  const sun = new THREE.DirectionalLight('#fff3dc', 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -250, right: 250, top: 250, bottom: -250, near: 1, far: 1200 });
  const moon = new THREE.DirectionalLight('#9fb6ff', 0.5);
  moon.position.set(-300, 500, -200); // fixed cool fill from the north-west; not an ephemeris moon
  scene.add(hemi, sun, sun.target, moon);
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
      const e = weatherEnv(envFromSun(s.elDeg), (weather ? weather.effects() : weatherEffects('clear')).visual);
      const az = (s.azDeg * Math.PI) / 180, el = (Math.max(s.elDeg, 2) * Math.PI) / 180;
      sun.position.set(Math.cos(el) * Math.sin(az), Math.sin(el), -Math.cos(el) * Math.cos(az)).multiplyScalar(800);
      sun.intensity = e.sunIntensity;
      hemi.intensity = e.ambient;
      moon.intensity = e.moonIntensity;
      hemi.color.set(e.skyHex).lerp(new THREE.Color('#bcd4ee'), 1 - e.starOpacity * 0.6);
      scene.background.set(e.skyHex);
      scene.fog.color.set(e.fogHex);
      scene.fog.near = e.fogNear;
      scene.fog.far = e.fogFar;
      starMat.opacity = e.starOpacity;
      renderer.toneMappingExposure = 0.95 + 0.25 * (e.sunIntensity / 2.4);
    },
  };
}
