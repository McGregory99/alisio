// Low-poly satellite model: bus with gold foil, solar array wings, a downlink antenna and (S1) a radar antenna.
// Built at unit scale; the sky system scales it up so it reads on the compressed sky sphere. Local +z faces the dish.
import { satVariant } from './link-math.mjs';
import { solarTexture, glowTexture } from './fx-textures.mjs';

export function makeSatModel(THREE, family, { scale = 5.5 } = {}) {
  const v = satVariant(family);
  const g = new THREE.Group();
  const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.2, flatShading: true, ...o });
  const solar = new THREE.MeshStandardMaterial({ map: solarTexture(THREE), roughness: 0.35, metalness: 0.4, emissive: '#0a1530', emissiveIntensity: 0.6 });
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
  const b = v.bus;

  add(new THREE.BoxGeometry(2.4 * b, 2.2 * b, 3.2 * b), std('#e6e2d8'), 0, 0, 0);
  add(new THREE.BoxGeometry(2.5 * b, 1.1 * b, 3.3 * b), std('#d4a548', { metalness: 0.6, roughness: 0.35 }), 0, -0.7 * b, 0);
  add(new THREE.BoxGeometry(1 * b, 0.3, 1.4 * b), std('#2f6fbf'), 0, 1.25 * b, 0);

  const sides = v.wings === 2 ? [-1, 1] : [1];
  for (const sd of sides) {
    add(new THREE.CylinderGeometry(0.07, 0.07, 1.6, 5).rotateZ(Math.PI / 2), std('#8b929b'), sd * 1.9 * b, 0, 0);
    for (let i = 0; i < v.panels; i++) add(new THREE.BoxGeometry(2.3, 0.1, 2.8), solar, sd * (3.7 + i * 2.4) * b, 0, 0);
  }
  const dish = add(new THREE.CylinderGeometry(0.9, 0.25, 0.7, 12).rotateX(Math.PI / 2), std('#f4f3ef'), 0, 0.2, 1.9 * b);
  dish.name = 'downlink-antenna';
  if (v.radar) add(new THREE.BoxGeometry(0.35, 0.9, 5.6), std('#bfc4cc', { metalness: 0.5 }), 0, -1.45 * b - 0.4, -0.2); // SAR panel under the bus

  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(THREE), color: '#4fd8ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  halo.scale.setScalar(5.5);
  g.add(halo);
  g.scale.setScalar(scale);
  return { group: g, halo };
}
