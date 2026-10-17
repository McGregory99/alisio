// Sky satellites (R5.1): SGP4 positions from the schedule drawn on a sphere centred on the assigned antenna pivot
// (station origin when unassigned). Positions are directions, not distances; names come from the mission catalog.
// Each satellite is a low-poly model with solar arrays, turned to face the dish it serves; an active pass draws
// a band-coloured beam from the dish feed to it (links.mjs).
import { skyPoint, SKY_RADIUS } from './sky-math.mjs';
import { terrainHeight } from './terrain-math.mjs';
import { createSentinelModel, orientForSky } from './sentinel-models.mjs';
import { specFor, displayScale } from './sentinel-spec.mjs';
import { glowTexture } from './fx-textures.mjs';
import { createLinks } from './links.mjs';
import { bandStyle } from './link-math.mjs';
import { registerAnchor } from './callouts-registry.mjs';

export function createSky({ THREE, scene, station, pivotOf }) {
  const group = new THREE.Group();
  scene.add(group);
  const items = new Map(); // norad -> { root, model, halo, entity }
  const origin = () => ({ x: 0, y: terrainHeight(0, 0), z: 0 });
  const links = createLinks({ THREE, parent: group, station });
  const states = new Map(); // norad -> { azDeg, elDeg, rangeKm, visible, antennaId }
  let t = 0;

  const notePoint = skyPoint(origin(), 180, 6);
  registerAnchor(scene, { id: 'sky-note', point: () => notePoint, content: () => ({ title: 'Sky: directions only, not distances', tone: 'note', priority: 5 }), maxDist: 1600 });

  // Real-scale spacecraft wrapped so nadir faces +z (lookAt target) and scaled up to read on the compressed sky.
  function buildModel(mission) {
    const spec = specFor(mission.id) ?? specFor(mission.family);
    const aimed = new THREE.Group();
    const sized = new THREE.Group();
    sized.add(orientForSky(THREE, createSentinelModel(THREE, mission.id)));
    sized.scale.setScalar(spec ? displayScale(spec) : 5.5);
    aimed.add(sized);
    return aimed;
  }
  function makeHalo() {
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(THREE), color: '#4fd8ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    halo.scale.setScalar(36);
    return halo;
  }

  function item(s) {
    let it = items.get(s.norad);
    if (!it) {
      const root = new THREE.Group();
      const model = buildModel(s.mission);
      const halo = makeHalo();
      const hit = new THREE.Mesh(new THREE.SphereGeometry(32, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); // generous click target
      model.add(halo);
      root.add(model, hit);
      group.add(root);
      it = { root, model, halo, norad: s.norad };
      it.entity = { kind: 'satellite', id: `sat-${s.norad}`, label: s.mission.name, provenance: s.mission.provenance };
      items.set(s.norad, it);
      registerAnchor(scene, {
        id: it.entity.id,
        point: () => ({ x: root.position.x, y: root.position.y + 20, z: root.position.z }),
        content: () => {
          const st = states.get(s.norad);
          if (!st?.visible) return null;
          const active = st.antennaId != null;
          return { title: s.mission.name, sub: active ? `el ${st.elDeg.toFixed(0)}° · ${s.mission.downlink.band}` : null, tone: 'sat', priority: active ? 90 : 10, entityId: it.entity.id };
        },
        maxDist: 1500,
      });
    }
    return it;
  }

  return {
    group, states, radius: SKY_RADIUS,
    /** Pickable satellites: [{ object, entity }]. Hidden ones (below the horizon) are skipped by the hit-test. */
    targets() { return [...items.values()].map((it) => ({ object: it.root, entity: it.entity })); },
    update({ schedule, dt = 0.016 }) {
      t += dt;
      for (const s of schedule.satellites) {
        const it = item(s);
        const visible = s.elDeg != null && s.elDeg > 0;
        states.set(s.norad, { azDeg: s.azDeg, elDeg: s.elDeg, rangeKm: s.rangeKm, visible, antennaId: s.antennaId });
        it.root.visible = visible;
        if (s.elDeg == null) continue;
        const centre = s.antennaId ? pivotOf(s.antennaId) : origin();
        const p = skyPoint(centre, s.azDeg, s.elDeg);
        it.root.position.set(p.x, p.y, p.z); // kept current below the horizon too, so a fly-to lands on its true direction
        if (!visible) continue;
        it.model.lookAt(centre.x, centre.y, centre.z); // antenna side faces the dish it serves
        const active = s.antennaId != null;
        const band = s.mission.downlink.band;
        it.halo.material.opacity = active ? 0.55 + 0.1 * Math.sin(t * 6) : 0.12;
        it.halo.material.color.set(bandStyle(band).hex);
      }
      links.update({
        lanes: schedule.lanes, pivotOf, t,
        satPoint: (norad) => { const it = items.get(norad); return it && it.root.visible ? it.root.position : null; },
      });
    },
  };
}
