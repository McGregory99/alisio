// Campus infrastructure drawn on the terrain: ring road, service spurs, access road toward the coast, footpaths,
// cable trenches, perimeter fence with a gate, lamp posts and light masts. All of it is an illustrative placeholder.
import { RING_R, FENCE_R, GATE, ringRoad, spurTo, resample, ribbonXZ, fencePosts, lShapedRun } from './campus-math.mjs';
import { terrainHeight } from './terrain-math.mjs';
import { glowTexture } from './fx-textures.mjs';

export function createRoads({ THREE, scene, entities }) {
  const group = new THREE.Group();
  group.name = 'campus-infrastructure';
  group.userData.provenance = 'illustrative';
  scene.add(group);

  const spots = entities.filter((e) => e.kind === 'antenna' || e.kind === 'facility').map((e) => e.position);
  const antennas = entities.filter((e) => e.kind === 'antenna').map((e) => e.position);
  const ops = entities.find((e) => e.facilityKind === 'building')?.position ?? { x: 0, z: 40 };
  const power = entities.find((e) => e.facilityKind === 'power-plant')?.position;
  const flag = (entities.find((e) => e.flagship) ?? entities.find((e) => e.kind === 'antenna'))?.position ?? { x: 0, z: 0 };

  /** One merged, terrain-draped ribbon mesh for several polylines (a single draw call per material). */
  function ribbons(lines, half, yOff, material) {
    const pos = [], idx = [];
    for (const line of lines) {
      const { verts, indices } = ribbonXZ(resample(line, 3), half);
      const base = pos.length / 3;
      for (const v of verts) pos.push(v.x, terrainHeight(v.x, v.z) + yOff, v.z);
      for (const i of indices) idx.push(base + i);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, material);
    m.receiveShadow = true;
    group.add(m);
    return m;
  }
  const flatMat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.DoubleSide, ...extra });

  const ring = ringRoad(RING_R, 72);
  const gateAt = { x: Math.cos(GATE.angleRad) * RING_R, z: Math.sin(GATE.angleRad) * RING_R };
  const access = Array.from({ length: 11 }, (_, i) => ({ x: gateAt.x + Math.sin(i * 0.7) * 9, z: gateAt.z + i * 24 }));
  const spurs = [...spots.filter((p, i, a) => a.indexOf(p) === i), flag].map((p) => {
    const s = spurTo(p, RING_R), d = Math.hypot(s[1].x - s[0].x, s[1].z - s[0].z), k = Math.min(0.5, 12 / (d || 1));
    return [{ x: s[0].x + (s[1].x - s[0].x) * k, z: s[0].z + (s[1].z - s[0].z) * k }, s[1]];
  });
  ribbons([[...ring, ring[0]], access, ...spurs], 3, 0.14, flatMat('#4a4b4f'));
  ribbons([[...ring, ring[0]]], 0.14, 0.17, flatMat('#d8d4c6')); // edge/centre line, one thin stripe
  const links = [[ops, flag], [flag, power ?? ops], ...antennas.filter((a) => a !== flag).map((a) => [flag, a])];
  ribbons(links.map(([a, b]) => [a, b]), 0.9, 0.1, flatMat('#cdbf9f')); // footpaths
  const runs = [...antennas.map((a) => lShapedRun(a, ops)), ...(power ? [lShapedRun(power, ops)] : [])];
  ribbons(runs, 0.55, 0.09, flatMat('#3f332b')); // cable trenches
  ribbons(runs, 0.22, 0.12, flatMat('#35506f', { emissive: '#1b3a66', emissiveIntensity: 0.35 })); // trench cover plates

  // Fence: posts plus two rails (instanced), a gate with a guard hut.
  const posts = fencePosts(FENCE_R, 6);
  const dummy = new THREE.Object3D();
  const metal = new THREE.MeshStandardMaterial({ color: '#7f8790', roughness: 0.6, metalness: 0.5 });
  const postMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.18, 2.4, 0.18), metal, posts.length);
  posts.forEach((p, i) => { dummy.position.set(p.x, terrainHeight(p.x, p.z) + 1.2, p.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); postMesh.setMatrixAt(i, dummy.matrix); });
  const railMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.07, 0.07), metal, posts.length * 2);
  posts.forEach((p, i) => {
    const q = posts[(i + 1) % posts.length];
    if (Math.hypot(q.x - p.x, q.z - p.z) > 8) { for (const k of [0, 1]) { dummy.scale.set(0, 0, 0); dummy.updateMatrix(); railMesh.setMatrixAt(i * 2 + k, dummy.matrix); } return; }
    const len = Math.hypot(q.x - p.x, q.z - p.z);
    for (const [k, h] of [[0, 0.7], [1, 1.9]]) {
      dummy.position.set((p.x + q.x) / 2, terrainHeight((p.x + q.x) / 2, (p.z + q.z) / 2) + h, (p.z + q.z) / 2);
      dummy.rotation.set(0, -Math.atan2(q.z - p.z, q.x - p.x), 0); dummy.scale.set(len, 1, 1); dummy.updateMatrix();
      railMesh.setMatrixAt(i * 2 + k, dummy.matrix);
    }
  });
  postMesh.castShadow = railMesh.castShadow = true;
  group.add(postMesh, railMesh);
  const gx = Math.cos(GATE.angleRad) * FENCE_R, gz = Math.sin(GATE.angleRad) * FENCE_R, gy = terrainHeight(gx, gz);
  const redWhite = new THREE.MeshStandardMaterial({ color: '#d84a3a', roughness: 0.6 });
  for (const sx of [-1, 1]) {
    const pil = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3.4, 0.8), new THREE.MeshStandardMaterial({ color: '#d9d5cc', roughness: 0.8 }));
    pil.position.set(gx + sx * (GATE.widthM / 2), gy + 1.7, gz); pil.castShadow = true; group.add(pil);
  }
  const arm = new THREE.Mesh(new THREE.BoxGeometry(GATE.widthM - 4, 0.22, 0.22), redWhite); arm.position.set(gx - 1, gy + 2.6, gz); group.add(arm);
  const hut = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.6, 3), new THREE.MeshStandardMaterial({ color: '#e6e2da', roughness: 0.8, flatShading: true })); hut.position.set(gx + GATE.widthM / 2 + 3, gy + 1.3, gz + 2); hut.castShadow = true; group.add(hut);

  // Lamp posts along the ring and four taller masts at the fence; emissive heads plus additive halos (cheap glow).
  const lampMat = new THREE.MeshStandardMaterial({ color: '#333', emissive: '#ffe2a8', emissiveIntensity: 0 });
  const lamps = [];
  for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2; lamps.push({ x: Math.cos(a) * (RING_R + 5), z: Math.sin(a) * (RING_R + 5), h: 6 }); }
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; lamps.push({ x: Math.cos(a) * (FENCE_R - 3), z: Math.sin(a) * (FENCE_R - 3), h: 14 }); }
  const halo = new Float32Array(lamps.length * 3);
  lamps.forEach((l, i) => {
    const y = terrainHeight(l.x, l.z);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, l.h, 6), metal); post.position.set(l.x, y + l.h / 2, l.z); post.castShadow = true; group.add(post);
    const head = new THREE.Mesh(new THREE.SphereGeometry(l.h > 10 ? 0.7 : 0.45, 8, 6), lampMat); head.position.set(l.x, y + l.h + 0.1, l.z); group.add(head);
    halo.set([l.x, y + l.h + 0.1, l.z], i * 3);
  });
  const haloGeo = new THREE.BufferGeometry(); haloGeo.setAttribute('position', new THREE.BufferAttribute(halo, 3));
  const haloMat = new THREE.PointsMaterial({ map: glowTexture(THREE), color: '#ffd9a0', size: 26, sizeAttenuation: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const haloPts = new THREE.Points(haloGeo, haloMat); haloPts.frustumCulled = false; group.add(haloPts);

  return {
    group, ring: ring, spurs,
    /** @param {number} k night factor 0..1 */
    setNight(k) { lampMat.emissiveIntensity = 2.2 * k; haloMat.opacity = 0.75 * k; },
  };
}
