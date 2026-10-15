// Sky satellites (R5.1): SGP4 positions from the schedule drawn on a sphere centred on the assigned antenna pivot
// (station origin when unassigned). Positions are directions, not distances; names come from the mission catalog.
import { skyPoint, SKY_RADIUS } from './sky-math.mjs';
import { textSprite } from './labels.mjs';
import { terrainHeight } from './terrain-math.mjs';

export function createSky({ THREE, scene, pivotOf }) {
  const group = new THREE.Group();
  scene.add(group);
  const items = new Map(); // norad -> { root, dot, label }
  const origin = () => ({ x: 0, y: terrainHeight(0, 0), z: 0 });

  const note = textSprite(THREE, 'Sky: directions only, not distances', { scale: [120, 22] });
  note.position.copy(skyPoint(origin(), 180, 6));
  group.add(note);

  function item(s) {
    let it = items.get(s.norad);
    if (!it) {
      const root = new THREE.Group();
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(2.6, 12, 8),
        new THREE.MeshBasicMaterial({ color: '#9fd0ff', fog: false }),
      );
      const label = textSprite(THREE, s.mission.name, { scale: [84, 15.75] });
      label.position.y = 11;
      const hit = new THREE.Mesh(new THREE.SphereGeometry(9, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); // generous click target
      root.add(dot, label, hit);
      group.add(root);
      it = { root, dot, label };
      it.entity = { kind: 'satellite', id: `sat-${s.norad}`, label: s.mission.name, provenance: s.mission.provenance };
      items.set(s.norad, it);
    }
    return it;
  }

  const states = new Map(); // norad -> { azDeg, elDeg, rangeKm, visible, antennaId }
  return {
    group, states, radius: SKY_RADIUS,
    /** Pickable satellites: [{ object, entity }]. Hidden ones (below the horizon) are skipped by the hit-test. */
    targets() { return [...items.values()].map((it) => ({ object: it.root, entity: it.entity })); },
    update({ schedule }) {
      for (const s of schedule.satellites) {
        const it = item(s);
        const visible = s.elDeg != null && s.elDeg > 0;
        states.set(s.norad, { azDeg: s.azDeg, elDeg: s.elDeg, rangeKm: s.rangeKm, visible, antennaId: s.antennaId });
        it.root.visible = visible;
        if (s.elDeg == null) continue;
        const p = skyPoint(s.antennaId ? pivotOf(s.antennaId) : origin(), s.azDeg, s.elDeg);
        it.root.position.set(p.x, p.y, p.z); // kept current below the horizon too, so a fly-to lands on its true direction
        if (!visible) continue;
        const active = s.antennaId != null;
        it.dot.material.color.set(active ? '#ffe28a' : '#9fd0ff');
        it.dot.scale.setScalar(active ? 1.6 : 1);
      }
    },
  };
}
