// Terrain, Atlantic sea and the compressed coast marker. Flat-shaded clay look (Downlink technique): facets are
// coloured by height and slope (ochre soil, dark basalt, pale shore), with rocks and sparse scrub scattered on top.
import { terrainHeight, SEA_LEVEL, COAST_Z, hash2, vnoise, groundColor, scatterPoints, foamAlpha, seaDepthTint } from './terrain-math.mjs';
import { registerAnchor } from './callouts-registry.mjs';

export function createTerrain({ THREE, scene }) {
  const SIZE = 2600, N = 230;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, N, N);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, COAST_Z - SIZE / 2 + 560);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, terrainHeight(p.getX(i), p.getZ(i)));
  const flat = geo.toNonIndexed();
  geo.dispose();
  flat.computeVertexNormals();

  const pos = flat.attributes.position, nor = flat.attributes.normal;
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i += 3) {
    const x = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3, z = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
    const y = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
    c.set(groundColor({ h: y, ny: nor.getY(i), n: vnoise(x * 0.03, z * 0.03) }));
    const jitter = 0.94 + hash2(Math.floor(x), Math.floor(z)) * 0.12; // per-facet clay variation
    for (let k = 0; k < 3; k++) col.set([c.r * jitter, c.g * jitter, c.b * jitter], (i + k) * 3);
  }
  flat.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const land = new THREE.Mesh(flat, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }));
  land.receiveShadow = true;
  scene.add(land);

  // Atlantic: a deep plane everywhere plus a shallow/surf overlay that follows the real shoreline of the heightfield.
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(7000, 3400, 1, 1).rotateX(-Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: '#3a8aa6' }),
  );
  sea.position.set(0, SEA_LEVEL - 0.4, COAST_Z + 1500);
  scene.add(sea);

  const shore = new THREE.PlaneGeometry(2600, 260, 200, 40);
  shore.rotateX(-Math.PI / 2);
  shore.translate(0, SEA_LEVEL - 0.3, COAST_Z + 30);
  const sp = shore.attributes.position, sc = new Float32Array(sp.count * 4), tint = new THREE.Color();
  for (let i = 0; i < sp.count; i++) {
    const h = terrainHeight(sp.getX(i), sp.getZ(i)), depth = Math.max(0, -h), foam = foamAlpha(h);
    tint.set(seaDepthTint(depth)).lerp(new THREE.Color('#ffffff'), foam);
    const a = h > 2.1 ? 0 : Math.max(foam, (1 - Math.min(1, depth / 11)) * 0.9);
    sc.set([tint.r, tint.g, tint.b, a], i * 4);
  }
  shore.setAttribute('color', new THREE.BufferAttribute(sc, 4));
  const shoreMesh = new THREE.Mesh(shore, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  shoreMesh.renderOrder = 1;
  scene.add(shoreMesh);

  // Rocks (dark basalt boulders) and scrub (dull green-grey tufts), instanced: two draw calls.
  const bounds = { x0: -750, x1: 750, z0: -620, z1: 380 }, exclude = { x: 0, z: 0, r: 125 };
  const rocks = scatterPoints({ seed: 11, count: 900, bounds, heightAt: terrainHeight, minLand: 2.5, exclude });
  const scrub = scatterPoints({ seed: 23, count: 1100, bounds, heightAt: terrainHeight, minLand: 3, exclude });
  const dummy = new THREE.Object3D();
  const rockMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#5a4a42', roughness: 1, flatShading: true }), rocks.length);
  rocks.forEach((r, i) => {
    dummy.position.set(r.x, r.y + r.s * 0.4, r.z); dummy.rotation.set(r.rot, r.rot * 1.7, 0); dummy.scale.set(r.s * 2.2, r.s * 1.5, r.s * 2.6); dummy.updateMatrix();
    rockMesh.setMatrixAt(i, dummy.matrix);
  });
  rockMesh.castShadow = rockMesh.receiveShadow = true;
  const scrubMesh = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1.6, 5), new THREE.MeshStandardMaterial({ color: '#7f7d57', roughness: 1, flatShading: true }), scrub.length);
  scrub.forEach((r, i) => {
    dummy.position.set(r.x, r.y + r.s * 0.5, r.z); dummy.rotation.set(0, r.rot, 0); dummy.scale.set(r.s * 1.6, r.s * 1.2, r.s * 1.6); dummy.updateMatrix();
    scrubMesh.setMatrixAt(i, dummy.matrix);
    scrubMesh.setColorAt(i, tint.set(r.rot > 3.2 ? '#8a8658' : '#6f7550'));
  });
  scrubMesh.receiveShadow = true;
  scene.add(rockMesh, scrubMesh);

  registerAnchor(scene, {
    id: 'coast-note', maxDist: 2200,
    point: () => ({ x: 0, y: 30, z: COAST_Z - 30 }),
    content: () => ({ title: 'coast (compressed, illustrative)', tone: 'note', priority: 8 }),
  });

  return { update() {}, land, sea, shore: shoreMesh, rocks: rockMesh, scrub: scrubMesh };
}
