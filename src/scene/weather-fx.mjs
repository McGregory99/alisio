// Illustrative weather effects (R8.1): low cloud, rain, wind streaks and dust motes. Intensities come from the
// selected preset (core/weather `visual`); fog, tint and light are handled by the env system. Real-time driven
// (frame.dt), so the effects look the same at any simulation warp. Not a live feed.
import { wrap, cloudLayout, WIND_DIR } from './weather-fx-math.mjs';
import { terrainHeight } from './terrain-math.mjs';

const RAIN_N = 1800, STREAK_N = 260, DUST_N = 700, CLOUD_N = 16;
const BOX = 700; // effects live in a box of this width around the campus

export function createWeatherFx({ THREE, scene, weather }) {
  const base = terrainHeight(0, 0);
  const group = new THREE.Group();
  scene.add(group);
  const rnd = (i, k) => { const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return s - Math.floor(s); };

  // Cloud: flattened soft ellipsoids drifting with the wind.
  const clouds = new THREE.Group();
  const cloudMat = new THREE.MeshLambertMaterial({ color: '#b9c2cc', transparent: true, opacity: 0, depthWrite: false, fog: false });
  const cloudGeo = new THREE.SphereGeometry(1, 14, 8);
  const cloudData = cloudLayout(CLOUD_N);
  for (const c of cloudData) {
    const m = new THREE.Mesh(cloudGeo, cloudMat);
    m.position.set(c.x, base + c.y, c.z);
    m.scale.set(c.sx, c.sy, c.sz);
    clouds.add(m);
  }
  group.add(clouds);

  // Rain: vertical segments falling at 170 m/s.
  const rainPos = new Float32Array(RAIN_N * 6);
  const rainHead = new Float32Array(RAIN_N * 3);
  for (let i = 0; i < RAIN_N; i++) rainHead.set([(rnd(i, 1) - 0.5) * BOX, rnd(i, 2) * 260, (rnd(i, 3) - 0.5) * BOX], i * 3);
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rainMat = new THREE.LineBasicMaterial({ color: '#b8cde0', transparent: true, opacity: 0, depthWrite: false, fog: false });
  const rain = new THREE.LineSegments(rainGeo, rainMat);
  rain.frustumCulled = false;
  group.add(rain);

  // Wind streaks: long thin horizontal lines racing along the trade wind direction.
  const strPos = new Float32Array(STREAK_N * 6);
  const strHead = new Float32Array(STREAK_N * 3);
  for (let i = 0; i < STREAK_N; i++) strHead.set([(rnd(i, 4) - 0.5) * BOX, 4 + rnd(i, 5) * 110, (rnd(i, 6) - 0.5) * BOX], i * 3);
  const strGeo = new THREE.BufferGeometry();
  strGeo.setAttribute('position', new THREE.BufferAttribute(strPos, 3));
  const strMat = new THREE.LineBasicMaterial({ color: '#e8f1fa', transparent: true, opacity: 0, depthWrite: false, fog: false });
  const streaks = new THREE.LineSegments(strGeo, strMat);
  streaks.frustumCulled = false;
  group.add(streaks);

  // Dust motes: warm specks drifting slowly in the haze.
  const dustPos = new Float32Array(DUST_N * 3);
  for (let i = 0; i < DUST_N; i++) dustPos.set([(rnd(i, 7) - 0.5) * BOX, 2 + rnd(i, 8) * 160, (rnd(i, 9) - 0.5) * BOX], i * 3);
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({ color: '#d9b27c', size: 3, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  group.add(dust);

  clouds.name = 'clouds'; rain.name = 'rain'; streaks.name = 'wind'; dust.name = 'dust';
  const half = BOX / 2;
  return {
    group,
    /** Names of the effect objects currently visible (used by the manual check). */
    activeEffects: () => [clouds, rain, streaks, dust].filter((o) => o.visible).map((o) => o.name),
    update({ dt }) {
      const v = weather.effects().visual;
      const step = Math.min(0.1, Math.max(0, dt));
      clouds.visible = v.cloudCover > 0;
      rain.visible = v.rain > 0;
      streaks.visible = v.windStreaks > 0;
      dust.visible = v.dust > 0;

      if (clouds.visible) {
        cloudMat.opacity = 0.85 * v.cloudCover;
        for (const m of clouds.children) {
          m.position.x = wrap(m.position.x + WIND_DIR.x * 6 * step, -950, 1900);
          m.position.z = wrap(m.position.z + WIND_DIR.z * 6 * step, -950, 1900);
        }
      }
      if (rain.visible) {
        rainMat.opacity = 0.55 * v.rain;
        for (let i = 0; i < RAIN_N; i++) {
          const j = i * 3;
          rainHead[j + 1] = wrap(rainHead[j + 1] - 170 * step, 0, 260);
          rainHead[j] = wrap(rainHead[j] + WIND_DIR.x * 12 * step, -half, BOX);
          rainHead[j + 2] = wrap(rainHead[j + 2] + WIND_DIR.z * 12 * step, -half, BOX);
          const k = i * 6;
          rainPos[k] = rainHead[j]; rainPos[k + 1] = base + rainHead[j + 1]; rainPos[k + 2] = rainHead[j + 2];
          rainPos[k + 3] = rainHead[j] - WIND_DIR.x * 1.5; rainPos[k + 4] = base + rainHead[j + 1] + 7; rainPos[k + 5] = rainHead[j + 2] - WIND_DIR.z * 1.5;
        }
        rainGeo.attributes.position.needsUpdate = true;
      }
      if (streaks.visible) {
        strMat.opacity = 0.5 * v.windStreaks;
        for (let i = 0; i < STREAK_N; i++) {
          const j = i * 3;
          strHead[j] = wrap(strHead[j] + WIND_DIR.x * 150 * step, -half, BOX);
          strHead[j + 2] = wrap(strHead[j + 2] + WIND_DIR.z * 150 * step, -half, BOX);
          const k = i * 6, len = 26 + rnd(i, 10) * 30;
          strPos[k] = strHead[j]; strPos[k + 1] = base + strHead[j + 1]; strPos[k + 2] = strHead[j + 2];
          strPos[k + 3] = strHead[j] - WIND_DIR.x * len; strPos[k + 4] = base + strHead[j + 1]; strPos[k + 5] = strHead[j + 2] - WIND_DIR.z * len;
        }
        strGeo.attributes.position.needsUpdate = true;
      }
      if (dust.visible) {
        dustMat.opacity = 0.6 * v.dust;
        for (let i = 0; i < DUST_N; i++) {
          const j = i * 3;
          dustPos[j] = wrap(dustPos[j] + WIND_DIR.x * 9 * step, -half, BOX);
          dustPos[j + 2] = wrap(dustPos[j + 2] + WIND_DIR.z * 9 * step, -half, BOX);
          dustPos[j + 1] = base + wrap(dustPos[j + 1] - base + Math.sin(i + dustPos[j] * 0.05) * 0.4 * step, 2, 160);
        }
        dustGeo.attributes.position.needsUpdate = true;
      }
    },
  };
}
