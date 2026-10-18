// Network egress: a fibre trench from the campus toward off-site processing centres (generic, not a named site).
import { entitiesFromStation } from '../core/station-entities.mjs';
import { egressPath } from './station-assets-math.mjs';
import { surfaceHeight } from './terrain-math.mjs';
import { registerAnchor } from './callouts-registry.mjs';

const HEADING_RAD = (3 * Math.PI) / 2; // west, away from the coast; illustrative direction
const LENGTH_M = 520, STEP_M = 20;

export function createEgress({ THREE, scene, station }) {
  const link = entitiesFromStation(station).find((e) => e.kind === 'link');
  if (!link) return { update() {}, link: null };
  const origin = entitiesFromStation(station).find((e) => e.kind === 'facility' && e.facilityKind === 'building')?.position ?? { x: 0, z: 0 };
  const pts = egressPath(origin, HEADING_RAD, LENGTH_M, STEP_M).map((p) => new THREE.Vector3(p.x, surfaceHeight(p.x, p.z) + 0.5, p.z));

  const group = new THREE.Group();
  const trench = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 4, 1.1, 6, false),
    new THREE.MeshStandardMaterial({ color: '#4a3b30', roughness: 1, flatShading: true }),
  );
  trench.receiveShadow = true;
  const fibreMat = new THREE.MeshStandardMaterial({ color: '#2f6fbf', emissive: '#4aa3ff', emissiveIntensity: 0.9, roughness: 0.4 });
  const fibre = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => p.clone().setY(p.y + 0.9))), pts.length * 4, 0.35, 6, false), fibreMat);
  group.add(trench, fibre);

  const end = pts[pts.length - 1];
  registerAnchor(scene, {
    id: link.id, maxDist: 1400,
    point: () => ({ x: end.x, y: end.y + 14, z: end.z }),
    content: () => ({ title: `${link.label} (generic)`, tone: 'note', provenance: link.provenance, entityId: link.id, priority: 45 }),
  });
  group.userData.entityId = link.id;
  scene.add(group);

  return { link, group, path: pts, pickables: [group], update() {} };
}
