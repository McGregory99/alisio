// The Earth of the space view: a sphere with an equirectangular canvas built at run time from the embedded coastline
// data (no image files), a faint graticule, an atmosphere rim and a day/night terminator from the true sun direction.
import { EARTH_RADIUS_KM, latLonToXyz, equirect, graticule, circleOnSphere, footprintRadiusDeg } from './space-math.mjs';

const TEX_W = 2048, TEX_H = 1024;

/** Paint ocean, land fill and coastline onto a 2D context of size w x h. Exported for tests with a recording context. */
export function paintEarth(g, coastlines, w, h) {
  const sea = g.createLinearGradient(0, 0, 0, h);
  sea.addColorStop(0, '#16407a'); sea.addColorStop(0.5, '#1b5a9c'); sea.addColorStop(1, '#16407a');
  g.fillStyle = sea; g.fillRect(0, 0, w, h);
  g.beginPath();
  for (const ring of coastlines) {
    ring.forEach(([lon, lat], i) => { const p = equirect(lon, lat, w, h); if (i === 0) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y); });
    g.closePath();
  }
  g.fillStyle = '#4f8a52'; g.fill();
  g.strokeStyle = 'rgba(214,236,200,.85)'; g.lineWidth = 1.4; g.lineJoin = 'round'; g.stroke();
}

const EARTH_VERT = `
varying vec3 vWorldNormal; varying vec2 vUv; varying vec3 vViewDir;
void main() {
  vUv = uv;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vViewDir = normalize(cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const EARTH_FRAG = `
uniform sampler2D map; uniform vec3 sunDir;
varying vec3 vWorldNormal; varying vec2 vUv; varying vec3 vViewDir;
void main() {
  vec3 n = normalize(vWorldNormal);
  float d = dot(n, normalize(sunDir));
  float day = smoothstep(-0.10, 0.22, d);
  vec3 tex = texture2D(map, vUv).rgb;
  vec3 lit = tex * (0.30 + 0.80 * max(d, 0.0));
  vec3 night = tex * vec3(0.08, 0.10, 0.17);
  vec3 col = mix(night, lit, day);
  col += vec3(1.0, 0.5, 0.25) * exp(-pow(d / 0.10, 2.0)) * 0.05;
  float f = pow(1.0 - max(dot(n, normalize(vViewDir)), 0.0), 3.0);
  col += vec3(0.30, 0.55, 1.0) * f * (0.06 + 0.5 * day);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;
const ATMO_VERT = `
varying vec3 vN; varying vec3 vWorldNormal;
void main() {
  vN = normalize(normalMatrix * normal);
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const ATMO_FRAG = `
uniform vec3 sunDir; uniform float zmax;
varying vec3 vN; varying vec3 vWorldNormal;
void main() {
  float k = clamp(-vN.z / zmax, 0.0, 1.0);
  float sun = 0.22 + 0.78 * smoothstep(-0.35, 0.45, dot(normalize(vWorldNormal), normalize(sunDir)));
  float a = pow(k, 1.8) * sun;
  gl_FragColor = vec4(vec3(0.32, 0.6, 1.0) * a, a);
  #include <colorspace_fragment>
}`;

function lineFrom(THREE, pts, material, closed = false) {
  const arr = new Float32Array(pts.length * 3);
  pts.forEach((p, i) => { arr[i * 3] = p.x; arr[i * 3 + 1] = p.y; arr[i * 3 + 2] = p.z; });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  return closed ? new THREE.LineLoop(geo, material) : new THREE.Line(geo, material);
}

/**
 * @returns {{ group: object, spin: (gmstRad:number)=>void, setSun: (dir:{x,y,z})=>void }}
 *   `group` holds the Earth-fixed things (sphere, graticule, station); it is spun about +y by GMST. The atmosphere sits outside it.
 */
export function createEarth({ THREE, coastlines, station, glowTexture }) {
  const root = new THREE.Group();
  const group = new THREE.Group();
  root.add(group);
  const sunDir = new THREE.Vector3(1, 0, 0);

  let map = null;
  try {
    const c = document.createElement('canvas');
    c.width = TEX_W; c.height = TEX_H;
    paintEarth(c.getContext('2d'), coastlines, TEX_W, TEX_H);
    map = new THREE.CanvasTexture(c);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
  } catch { map = null; } // canvas/texture unavailable: a plain blue ball with the graticule still reads as the Earth
  if (!map) {
    const px = new Uint8Array([27, 90, 156, 255]);
    map = new THREE.DataTexture(px, 1, 1); map.colorSpace = THREE.SRGBColorSpace; map.needsUpdate = true;
  }

  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_RADIUS_KM, 64, 48),
    new THREE.ShaderMaterial({ vertexShader: EARTH_VERT, fragmentShader: EARTH_FRAG, uniforms: { map: { value: map }, sunDir: { value: sunDir }} }),
  );
  group.add(earth);

  const gratMat = new THREE.LineBasicMaterial({ color: '#bcd8ff', transparent: true, opacity: 0.16, depthWrite: false });
  for (const line of graticule(30, 5)) group.add(lineFrom(THREE, line.map((p) => latLonToXyz(p.latDeg, p.lonDeg, EARTH_RADIUS_KM * 1.0015)), gratMat));

  const shell = 1.035;
  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_RADIUS_KM * shell, 64, 48),
    new THREE.ShaderMaterial({
      vertexShader: ATMO_VERT, fragmentShader: ATMO_FRAG, uniforms: { sunDir: { value: sunDir }, zmax: { value: Math.sqrt(1 - 1 / (shell * shell)) } },
      side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    }),
  );
  root.add(atmosphere);

  // Station marker and the approximate visibility footprint of its elevation mask at a typical Sentinel altitude.
  const loc = station.location;
  const stationXyz = latLonToXyz(loc.latDeg, loc.lonDeg, EARTH_RADIUS_KM * 1.003);
  const mark = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array([stationXyz.x, stationXyz.y, stationXyz.z]), 3)),
    new THREE.PointsMaterial({ color: '#ff6b5e', size: 13, sizeAttenuation: false, map: glowTexture, transparent: true, depthWrite: false }),
  );
  group.add(mark);
  const ringPts = circleOnSphere(loc, footprintRadiusDeg(700, station.maskDeg ?? 5), 96).map((p) => latLonToXyz(p.latDeg, p.lonDeg, EARTH_RADIUS_KM * 1.003));
  group.add(lineFrom(THREE, ringPts, new THREE.LineBasicMaterial({ color: '#ff8a7e', transparent: true, opacity: 0.45, depthWrite: false }), true));

  return {
    root, group,
    stationPoint: stationXyz, // Earth-fixed scene position; spin it with the group for the world position
    spin(gmstRad) { group.rotation.y = gmstRad; },
    setSun(d) { sunDir.set(d.x, d.y, d.z).normalize(); },
  };
}
