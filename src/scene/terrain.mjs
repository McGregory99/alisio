// Terrain, Atlantic sea and the coast marker. Flat-shaded clay look (Downlink technique): facets are coloured by
// height and slope (ochre soil, dark basalt, pale shore, gravel riverbeds, pale dune sand), with rocks and sparse
// scrub scattered on top. Geometry is true to the ESA-reported distances (station ~205 m up, sea ~1.75 km south);
// the shape in between is illustrative (docs/orography.md).
import { terrainHeight, SEA_LEVEL, COAST_Z, GRID_X, GRID_Z, hash2, vnoise, groundColor, scatterPoints, foamAlpha, seaDepthTint, seaWave, duneMask, barrancoBed } from './terrain-math.mjs';
import { registerAnchor } from './callouts-registry.mjs';
import { TOWN_BOX } from './town-math.mjs';
import { createTown } from './town.mjs';

/** Indexed-free faceted mesh over the non-uniform grid (fine near the campus and shore, coarse far away). */
function terrainGeometry(THREE) {
  const nx = GRID_X.length, nz = GRID_Z.length;
  const hts = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) hts[j * nx + i] = terrainHeight(GRID_X[i], GRID_Z[j]);
  const quads = (nx - 1) * (nz - 1), pos = new Float32Array(quads * 6 * 3);
  let o = 0;
  const put = (i, j) => { pos[o++] = GRID_X[i]; pos[o++] = hts[j * nx + i]; pos[o++] = GRID_Z[j]; };
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { // same triangulation as surfaceHeight
    put(i, j); put(i, j + 1); put(i + 1, j);
    put(i + 1, j); put(i, j + 1); put(i + 1, j + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

export function createTerrain({ THREE, scene }) {
  const flat = terrainGeometry(THREE);

  const pos = flat.attributes.position, nor = flat.attributes.normal;
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i += 3) {
    const x = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3, z = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
    const y = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
    c.set(groundColor({ h: y, ny: nor.getY(i), n: vnoise(x * 0.03, z * 0.03), dune: duneMask(x, z), bed: barrancoBed(x, z) }));
    const jitter = 0.94 + hash2(Math.floor(x), Math.floor(z)) * 0.12; // per-facet clay variation
    for (let k = 0; k < 3; k++) col.set([c.r * jitter, c.g * jitter, c.b * jitter], (i + k) * 3);
  }
  flat.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const land = new THREE.Mesh(flat, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }));
  land.receiveShadow = true;
  scene.add(land);

  // Atlantic: a deep plane everywhere south of the foothills plus a shallow/surf overlay that follows the shoreline.
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(14000, 5000, 1, 1).rotateX(-Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: '#3a8aa6' }),
  );
  sea.position.set(0, SEA_LEVEL - 1.2, COAST_Z + 1850);
  scene.add(sea);

  // Swell: a coarse faceted grid over the near sea whose heights roll with time (faded to flat at its borders).
  const SW = 4800, SD = 1500, swellGeo = new THREE.PlaneGeometry(SW, SD, 300, 94).rotateX(-Math.PI / 2);
  swellGeo.translate(0, 0, COAST_Z - 60 + SD / 2);
  const swellBase = Float32Array.from(swellGeo.attributes.position.array);
  const swell = new THREE.Mesh(swellGeo, new THREE.MeshLambertMaterial({ color: '#3a8aa6', flatShading: true }));
  swell.position.y = SEA_LEVEL - 0.4;
  swell.frustumCulled = false;
  scene.add(swell);
  let seaT = 0, swellAcc = 0; // the swell is rebuilt at 30 Hz at most
  const edge = (v, half) => Math.min(1, (half - Math.abs(v)) / (half * 0.12));
  function updateSwell() {
    const q = swellGeo.attributes.position;
    for (let i = 0; i < q.count; i++) {
      const x = swellBase[i * 3], z = swellBase[i * 3 + 2];
      const fade = Math.max(0, Math.min(edge(x, SW / 2), (SD - (z - (COAST_Z - 60))) / (SD * 0.12), (z - (COAST_Z - 60)) / 90));
      q.setY(i, seaWave(x, z, seaT) * fade);
    }
    q.needsUpdate = true; // flat shading derives normals per facet, so none to recompute
  }
  updateSwell();

  const SHORE_X0 = -3000, SHORE_X1 = 5000;
  const shore = new THREE.PlaneGeometry(SHORE_X1 - SHORE_X0, 400, 330, 40);
  shore.rotateX(-Math.PI / 2);
  shore.translate((SHORE_X0 + SHORE_X1) / 2, SEA_LEVEL - 0.3, COAST_Z + 60);
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
  const bounds = { x0: -1500, x1: 1500, z0: -1300, z1: 1700 }, exclude = { x: 0, z: 0, r: 140 };
  const reject = (x, z) => duneMask(x, z) > 0.25 || (x > TOWN_BOX.x0 - 20 && x < TOWN_BOX.x1 + 20 && z > TOWN_BOX.z0 - 20);
  const rocks = scatterPoints({ seed: 11, count: 3200, bounds, heightAt: terrainHeight, minLand: 2.5, exclude, reject });
  const scrub = scatterPoints({ seed: 23, count: 3800, bounds, heightAt: terrainHeight, minLand: 3, exclude, reject });
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
    id: 'coast-note', maxDist: 3200,
    point: () => ({ x: 0, y: terrainHeight(0, COAST_Z - 30) + 30, z: COAST_Z - 30 }),
    content: () => ({ title: 'coast ~1.75 km (ESA)', tone: 'note', provenance: 'verified', priority: 8 }),
  });

  const town = createTown({ THREE, scene });

  return { town, update({ dt = 0 } = {}) { seaT += dt; swellAcc += dt; if (swellAcc >= 1 / 30) { swellAcc = 0; updateSwell(); } }, swell, land, sea, shore: shoreMesh, rocks: rockMesh, scrub: scrubMesh };
}
