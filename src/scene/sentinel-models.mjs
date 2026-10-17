// Procedural Sentinel spacecraft (R5.1): one low-poly model per family, built in metres from sentinel-spec.mjs.
// Natural frame: x cross-track, y up, nadir = -y, z along-track. `orientForSky` re-aims nadir at +z, the axis
// sky.mjs turns toward the dish it serves, keeping the solar wings (cross-track x) horizontal.
import { specFor, SENTINEL_SPECS } from './sentinel-spec.mjs';
import { solarTexture } from './fx-textures.mjs';
import { makeSatModel } from './sat-model.mjs';

const caches = new WeakMap();
const cacheOf = (THREE) => {
  let c = caches.get(THREE);
  if (!c) { c = { geo: new Map(), mat: null }; caches.set(THREE, c); }
  return c;
};

function materials(THREE) {
  const c = cacheOf(THREE);
  if (c.mat) return c.mat;
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.15, flatShading: true, ...o });
  const tex = solarTexture(THREE);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  c.mat = {
    white: std('#ece9e2'),
    gold: std('#e0b04a', { metalness: 0.45, roughness: 0.35, emissive: '#4a3508', emissiveIntensity: 0.7 }),
    black: std('#17181c', { roughness: 0.8, metalness: 0.05 }),
    grey: std('#8f97a1', { metalness: 0.5 }),
    radiator: std('#cdd3da', { metalness: 0.3 }),
    sar: std('#272b33', { metalness: 0.35, roughness: 0.45 }),
    lens: std('#0a1428', { metalness: 0.8, roughness: 0.15, emissive: '#06142e', emissiveIntensity: 0.8 }),
    solar: new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35, metalness: 0.4, emissive: '#0a1530', emissiveIntensity: 0.55 }),
  };
  return c.mat;
}

function geo(THREE, key, make) {
  const m = cacheOf(THREE).geo;
  if (!m.has(key)) m.set(key, make());
  return m.get(key);
}

const box = (THREE, w, h, d) => geo(THREE, `b${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d));
const cyl = (THREE, rt, rb, h, seg = 14) => geo(THREE, `c${rt}|${rb}|${h}|${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg));
const cellPanel = (THREE, len, width, thick = 0.05) => geo(THREE, `p${len}|${width}|${thick}`, () => {
  const g = new THREE.BoxGeometry(len, thick, width);
  const uv = g.attributes.uv; // cell grid roughly every 0.5 m so lines scale with the panel
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.max(1, Math.round(len / 0.5)), uv.getY(i) * Math.max(1, Math.round(width / 0.5)));
  return g;
});

function builder(THREE, root) {
  const M = materials(THREE);
  const add = (geometry, mat, x = 0, y = 0, z = 0, parent = root) => {
    const m = new THREE.Mesh(geometry, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  return {
    M, add, root, THREE, geo: { box: (w, h, d) => box(THREE, w, h, d), cyl: (rt, rb, h, seg) => cyl(THREE, rt, rb, h, seg) },
    box: (w, h, d, mat, x, y, z) => add(box(THREE, w, h, d), mat, x, y, z),
    /** Dish whose open face looks down (-y) or up (+y). */
    dish(r, depth, mat, x, y, z, down = true) {
      return add(down ? cyl(THREE, r * 0.12, r, depth) : cyl(THREE, r, r * 0.12, depth), mat, x, y, z);
    },
    /** Panel train along `dir` (+1/-1 on x) starting at `x0`; hinge gaps between panels. */
    wing(spec, dir, x0, y = 0, z = 0) {
      const { len, width } = spec.panel;
      const bar = add(cyl(THREE, 0.05, 0.05, spec.boom ?? 0.3, 6), M.grey, x0 + dir * (spec.boom ?? 0.3) / 2, y, z);
      bar.rotation.z = Math.PI / 2;
      let x = x0 + dir * (spec.boom ?? 0.3);
      for (let i = 0; i < spec.panels; i++) {
        add(cellPanel(THREE, len - 0.04, width), M.solar, x + dir * len / 2, y, z);
        x += dir * len;
      }
    },
    star(x, y, z) { // star-tracker baffle
      this.add(cyl(THREE, 0.1, 0.16, 0.3, 8), M.black, x, y, z);
    },
  };
}

function sarPlate(b, s, side) {
  const { M } = b;
  const seg = s.sar.length / s.sar.panels;
  const plate = new b.THREE.Group();
  for (let i = 0; i < s.sar.panels; i++) {
    const z = -s.sar.length / 2 + seg * (i + 0.5);
    b.add(b.geo.box(0.1, s.sar.height + 0.08, seg - 0.05), M.white, 0, 0, z, plate);
    b.add(b.geo.box(0.04, s.sar.height - 0.1, seg - 0.2), M.sar, side * 0.05, 0, z, plate);
  }
  return plate;
}

function buildS1(b, s) {
  const { M } = b;
  b.box(s.bus.x, s.bus.y, s.bus.z, M.white, 0, 0, 0);
  b.box(s.bus.x + 0.06, 0.45, s.bus.z + 0.06, M.gold, 0, -s.bus.y / 2 + 0.22, 0);
  b.wing(s, 1, s.bus.x / 2, 0.1, 0);
  b.wing(s, -1, -s.bus.x / 2, 0.1, 0);
  // C-SAR: 5 deployed tiles forming a 12.3 m strip beside the body, tilted towards nadir on two struts
  const plate = sarPlate(b, s, 1);
  plate.position.set(s.bus.x / 2 + 0.55, -0.5, 0);
  plate.rotation.z = -0.5;
  b.root.add(plate);
  for (const z of [-1.2, 1.2]) {
    const st = b.add(b.geo.cyl(0.04, 0.04, 0.7, 6), M.grey, s.bus.x / 2 + 0.28, -0.3, z);
    st.rotation.z = Math.PI / 2 - 0.5;
  }
  b.dish(0.22, 0.12, M.white, 0, s.bus.y / 2 + 0.12, 0.8, false).name = 'x-band';
  b.star(0, s.bus.y / 2 + 0.15, -1.1);
}

function buildS2(b, s) {
  const { M } = b;
  b.box(s.bus.x, s.bus.y, s.bus.z, M.white, 0, 0, 0);
  b.box(s.bus.x + 0.06, s.bus.y * 0.55, s.bus.z + 0.06, M.gold, 0, -s.bus.y * 0.22, 0);
  b.box(s.bus.x * 0.9, 0.2, s.bus.z * 0.9, M.radiator, 0, s.bus.y / 2 + 0.1, 0); // top radiator
  // MSI: dark telescope housing under the bus with its nadir aperture
  b.box(s.msi.x, s.msi.y, s.msi.z, M.black, 0, -s.bus.y / 2 - s.msi.y / 2, 0);
  b.box(s.msi.x * 0.7, 0.04, s.msi.z * 0.5, M.lens, 0, -s.bus.y / 2 - s.msi.y - 0.01, 0.1);
  b.wing(s, 1, s.bus.x / 2, 0.3, 0);
  b.dish(0.3, 0.1, M.white, 0, s.bus.y / 2 + 0.55, -0.9, false).name = 'x-band';
  b.add(b.geo.cyl(0.04, 0.04, 0.4, 6), M.grey, 0, s.bus.y / 2 + 0.35, -0.9);
  b.star(-0.4, s.bus.y / 2 + 0.3, 0.9);
}

function buildS3(b, s) {
  const { M } = b;
  b.box(s.bus.x, s.bus.y, s.bus.z, M.white, 0, 0, 0);
  b.box(s.bus.x + 0.06, s.bus.y * 0.4, s.bus.z + 0.06, M.gold, 0, s.bus.y * 0.28, 0);
  // OLCI: fan of 5 cameras on the nadir face
  for (let i = 0; i < s.olciCameras; i++) {
    const a = (i - (s.olciCameras - 1) / 2) * 0.16;
    const cam = b.box(0.28, 0.42, 0.42, M.black, -0.55 + Math.sin(a) * 0.1, -s.bus.y / 2 - 0.2, a * 3);
    cam.rotation.x = a;
    b.add(b.geo.cyl(0.11, 0.11, 0.04, 8), M.lens, cam.position.x, -s.bus.y / 2 - 0.43, cam.position.z);
  }
  // SLSTR: dark housing with its scan cone
  b.box(0.7, 0.55, 0.9, M.black, 0.55, -s.bus.y / 2 - 0.27, -0.9);
  b.add(b.geo.cyl(0.28, 0.28, 0.4, 10), M.radiator, 0.55, -s.bus.y / 2 - 0.7, -0.9);
  // SRAL radar altimeter dish, nadir
  b.dish(s.altimeter.diameter / 2, 0.22, M.white, 0.1, -s.bus.y / 2 - 0.15, 1.0).name = 'altimeter';
  b.dish(0.22, 0.1, M.radiator, -0.6, -s.bus.y / 2 - 0.08, 1.4); // microwave radiometer
  b.wing(s, 1, s.bus.x / 2, 0.4, 0);
  b.dish(0.25, 0.1, M.white, 0, s.bus.y / 2 + 0.55, 0.5, false).name = 'x-band';
  b.add(b.geo.cyl(0.04, 0.04, 0.45, 6), M.grey, 0, s.bus.y / 2 + 0.3, 0.5);
}

function buildS5P(b, s) {
  const { M } = b;
  b.box(s.bus.x, s.bus.y, s.bus.z, M.white, 0, 0, 0);
  b.box(s.bus.x + 0.06, s.bus.y * 0.35, s.bus.z + 0.06, M.gold, 0, s.bus.y * 0.3, 0);
  // TROPOMI: telescope baffle with a wide nadir aperture
  b.box(s.tropomi.x + 0.3, 0.55, s.tropomi.z + 0.3, M.black, 0, -s.bus.y / 2 - 0.27, 0.2);
  b.box(s.tropomi.x, 0.04, s.tropomi.z, M.lens, 0, -s.bus.y / 2 - 0.56, 0.2);
  b.wing(s, 1, s.bus.x / 2, 0.2, 0);
  b.dish(0.22, 0.1, M.white, 0, s.bus.y / 2 + 0.4, -0.9, false).name = 'x-band';
  b.add(b.geo.cyl(0.04, 0.04, 0.3, 6), M.grey, 0, s.bus.y / 2 + 0.2, -0.9);
  b.star(0.5, s.bus.y / 2 + 0.15, 0.9);
}

function buildS6(b, s) {
  const { M } = b;
  b.box(s.bus.x, s.bus.y, s.bus.z, M.gold, 0, 0, 0);
  b.box(s.bus.x + 0.04, 0.18, s.bus.z + 0.04, M.white, 0, s.bus.y / 2 - 0.1, 0); // top radiator band
  b.wing(s, 1, s.bus.x / 2, 0, 0);
  b.wing(s, -1, -s.bus.x / 2, 0, 0);
  // Poseidon-4 altimeter dish, nadir, plus the AMR-C radiometer dish
  b.dish(s.altimeter.diameter / 2, 0.3, M.white, 0, -s.bus.y / 2 - 0.2, -0.2).name = 'altimeter';
  b.dish(0.35, 0.12, M.radiator, 0.7, -s.bus.y / 2 - 0.08, 1.5);
  b.dish(0.28, 0.1, M.white, 0, s.bus.y / 2 + 0.45, 0.8, false).name = 'x-band';
  b.add(b.geo.cyl(0.04, 0.04, 0.35, 6), M.grey, 0, s.bus.y / 2 + 0.25, 0.8);
  b.star(-0.6, s.bus.y / 2 + 0.2, -1.4);
}

const BUILDERS = { S1: buildS1, S2: buildS2, S3: buildS3, S5P: buildS5P, S6: buildS6 };

/** Model of one mission or family at real scale (metres), nadir = -y. Unknown ids get the generic model. */
export function createSentinelModel(THREE, familyOrMissionId) {
  const spec = specFor(familyOrMissionId);
  if (!spec) {
    const { group } = makeSatModel(THREE, familyOrMissionId, { scale: 1 });
    group.userData.family = null;
    return group;
  }
  const root = new THREE.Group();
  root.name = `sentinel-${spec.family}`;
  root.userData.family = spec.family;
  const b = builder(THREE, root);
  BUILDERS[spec.family](b, spec);
  return root;
}

/** Wrap a model for the sky: nadir (-y) points along +z (towards the dish after `lookAt`), wings stay horizontal. */
export function orientForSky(THREE, model) {
  const tilt = new THREE.Group(); // nadir -y -> +z; cross-track x stays horizontal, along-track z points up
  tilt.rotation.x = -Math.PI / 2;
  tilt.add(model);
  return tilt;
}

export { SENTINEL_SPECS };
