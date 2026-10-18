// Low-rise coastal town patch south of the station: instanced plain boxes, one draw call. All of it is an
// illustrative placeholder (no individual building is modelled from data); see docs/orography.md.
import { terrainHeight } from './terrain-math.mjs';
import { townLots } from './town-math.mjs';

const TONES = ['#ece4d2', '#e0cfae', '#d9b99a', '#f2efe8'];

export function createTown({ THREE, scene }) {
  const lots = townLots({ heightAt: terrainHeight });
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), Math.max(1, lots.length));
  const dummy = new THREE.Object3D(), tint = new THREE.Color();
  lots.forEach((l, i) => {
    const hgt = l.h + 1.2;
    dummy.position.set(l.x, l.y0 + hgt / 2, l.z); dummy.rotation.set(0, l.rot, 0); dummy.scale.set(l.w, hgt, l.d); dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, tint.set(TONES[l.tone]));
  });
  mesh.count = lots.length;
  mesh.name = 'coastal-town';
  mesh.userData.provenance = 'illustrative';
  scene.add(mesh);
  return { mesh, lots, update() {} };
}
