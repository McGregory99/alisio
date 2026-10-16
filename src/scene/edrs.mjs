// Optional EDRS relay layer (R8.3): EDRS-A (9 E) and EDRS-C (31 E) as marked directions on the sky sphere.
// Off by default: while off, nothing is built and the scene graph holds no EDRS element.
import { edrsRelays, EDRS_NOTE } from '../core/edrs.mjs';
import { skyPoint } from './sky-math.mjs';
import { textSprite } from './labels.mjs';
import { terrainHeight } from './terrain-math.mjs';

export function createEdrs({ THREE, scene, station, makeLabel }) {
  const label = makeLabel ?? ((text) => textSprite(THREE, text, { width: 640, scale: [150, 22.5] }));
  const relays = edrsRelays(station);
  let group = null;

  function build() {
    const g = new THREE.Group();
    g.userData.edrs = true;
    const centre = { x: 0, y: terrainHeight(0, 0), z: 0 }; // same centre as the sky sphere when unassigned
    for (const r of relays) {
      const root = new THREE.Group();
      root.userData.edrs = r.id;
      const p = skyPoint(centre, r.azDeg, r.elDeg);
      root.position.set(p.x, p.y, p.z);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(3.2, 12, 8), new THREE.MeshBasicMaterial({ color: '#d9a0ff', fog: false }));
      const text = label(`${r.label}: historical, unverified`);
      text.position.y = 12;
      root.add(dot, text);
      g.add(root);
    }
    return g;
  }

  return {
    note: EDRS_NOTE,
    enabled: () => group != null,
    names: () => (group ? relays.map((r) => r.label) : []),
    setEnabled(on) {
      if (on && !group) { group = build(); scene.add(group); }
      else if (!on && group) {
        scene.remove(group);
        group.traverse?.((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
        group = null;
      }
    },
    update() {},
  };
}
