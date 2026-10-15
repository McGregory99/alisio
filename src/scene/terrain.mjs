// Terrain, Atlantic sea and the compressed coast marker. Flat-shaded clay look (Downlink technique).
import { terrainHeight, SEA_LEVEL, COAST_Z } from './terrain-math.mjs';

function textSprite(THREE, text) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(12,18,28,.72)'; g.fillRect(0, 0, 512, 96);
  g.fillStyle = '#e8eef7'; g.font = '600 34px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 256, 48);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(150, 28, 1);
  s.renderOrder = 10;
  return s;
}

export function createTerrain({ THREE, scene }) {
  const SIZE = 2400, N = 200;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, N, N);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, COAST_Z - SIZE / 2 + 520);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, terrainHeight(p.getX(i), p.getZ(i)));
  const flat = geo.toNonIndexed();
  geo.dispose();
  flat.computeVertexNormals();

  const pos = flat.attributes.position, nor = flat.attributes.normal;
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i += 3) {
    const y = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3, ny = nor.getY(i);
    if (y < SEA_LEVEL + 0.5) c.set('#b9a47f');            // sand and wet shore
    else if (ny < 0.8) c.set('#6b4a3a');                   // dark volcanic slopes
    else c.set((Math.floor(pos.getX(i) * 0.05) + Math.floor(pos.getZ(i) * 0.05)) & 1 ? '#a8865f' : '#b8946a'); // arid ochre
    for (let k = 0; k < 3; k++) col.set([c.r, c.g, c.b], (i + k) * 3);
  }
  flat.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const land = new THREE.Mesh(flat, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }));
  land.receiveShadow = true;
  scene.add(land);

  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(6000, 3000, 1, 1).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: '#2b6878', roughness: 0.2, metalness: 0.08, flatShading: true, transparent: true, opacity: 0.92 }),
  );
  sea.position.set(0, SEA_LEVEL - 0.4, COAST_Z + 1400);
  scene.add(sea);

  const coast = textSprite(THREE, 'coast (compressed, illustrative)');
  coast.position.set(0, 40, COAST_Z - 30);
  scene.add(coast);

  return { update() {}, land, sea, coast };
}
