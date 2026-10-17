// Sun-driven environment: light, sky and fog colour, stars at night. Parameters come from env-math.
import { envFromSun, weatherEnv, gradeFromSun, sunGlowStrength, domeColors } from './env-math.mjs';
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

  // Sky dome: zenith-to-horizon haze gradient plus a soft sun glow, in one cheap shader (no postprocessing).
  const domeMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color('#8fb8d8') }, bot: { value: new THREE.Color('#a4c6de') }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color('#ffd9a0') }, glow: { value: 0 } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
    fragmentShader: `uniform vec3 top; uniform vec3 bot; uniform vec3 sunDir; uniform vec3 sunCol; uniform float glow; varying vec3 vW;
      void main(){ vec3 d = normalize(vW - cameraPosition); float h = d.y;
        vec3 c = mix(bot, top, smoothstep(-0.02, 0.5, h));
        float s = max(dot(d, sunDir), 0.0);
        c += sunCol * glow * (pow(s, 900.0) * 1.6 + pow(s, 40.0) * 0.28 + pow(s, 6.0) * 0.06);
        gl_FragColor = vec4(c, 1.0); }`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(5200, 24, 12), domeMat);
  dome.renderOrder = -10; dome.frustumCulled = false;
  scene.add(dome);

  // Time-of-day grade: a faint tint plus vignette laid over the canvas (CSS, so no extra render pass).
  const grade = document.createElement('div');
  grade.id = 'scene-grade'; grade.setAttribute('aria-hidden', 'true');
  grade.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:4';
  document.body.appendChild(grade);
  const sunV = new THREE.Vector3(), tmpC = new THREE.Color();

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
      sunV.set(Math.cos(el) * Math.sin(az), Math.sin(el), -Math.cos(el) * Math.cos(az));
      domeMat.uniforms.sunDir.value.copy(sunV);
      const clear = envFromSun(s.elDeg).sunIntensity;
      domeMat.uniforms.glow.value = sunGlowStrength(s.elDeg) * (clear > 0 ? Math.min(1, e.sunIntensity / clear) : 1); // weather dims the glow
      const dc = domeColors(e.skyHex, e.fogHex, Math.min(1, e.sunIntensity / 2.4));
      domeMat.uniforms.top.value.set(dc.top); domeMat.uniforms.bot.value.set(dc.bottom);
      domeMat.uniforms.sunCol.value.set(s.elDeg < 8 ? '#ffb070' : '#fff1d0');
      const g = gradeFromSun(s.elDeg);
      tmpC.set(g.tintHex);
      grade.style.background = `radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(5,10,25,${g.vignette}) 100%), rgba(${Math.round(tmpC.r * 255)},${Math.round(tmpC.g * 255)},${Math.round(tmpC.b * 255)},${g.tintAlpha.toFixed(3)})`;
      renderer.toneMappingExposure = 0.95 + 0.25 * (e.sunIntensity / 2.4);
    },
  };
}
