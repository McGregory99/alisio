// Dish-to-satellite links: an additive downlink beam with a soft glow, colour-coded by band (X cyan, S amber),
// plus amber TT&C uplink pulses. Direction exactness comes from the sky sphere: the beam ends at the satellite's
// sky point, which is a direction, not a distance. Everything is cheap (a few additive meshes), mobile friendly.
import { beamSegment, bandStyle, linkPlan, pulseFractions } from './link-math.mjs';
import { glowTexture } from './fx-textures.mjs';

export function createLinks({ THREE, parent, station }) {
  const antennas = new Map(station.antennas.map((a) => [a.id, a]));
  const beamGeo = new THREE.CylinderGeometry(1.3, 0.25, 1, 14, 1, true);
  const glowGeo = new THREE.CylinderGeometry(3.6, 0.8, 1, 14, 1, true);
  const up = new THREE.Vector3(0, 1, 0), dirV = new THREE.Vector3(), tmp = new THREE.Vector3();
  const links = new Map(); // antennaId -> { beam, glow, pulses, t }

  const additive = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });

  function linkFor(id) {
    let l = links.get(id);
    if (!l) {
      const beam = new THREE.Mesh(beamGeo, additive('#4fd8ff', 0));
      const glow = new THREE.Mesh(glowGeo, additive('#2a9fff', 0));
      beam.frustumCulled = glow.frustumCulled = false;
      beam.renderOrder = 5; glow.renderOrder = 4;
      const N = 6, pos = new Float32Array(N * 3);
      const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pulses = new THREE.Points(pg, new THREE.PointsMaterial({ map: glowTexture(THREE), color: '#ffb454', size: 14, sizeAttenuation: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      pulses.frustumCulled = false; pulses.renderOrder = 6;
      beam.visible = glow.visible = pulses.visible = false;
      parent.add(beam, glow, pulses);
      l = { beam, glow, pulses, N, pos };
      links.set(id, l);
    }
    return l;
  }

  return {
    links,
    /** @param {Map} lanes schedule lanes; @param pivotOf antenna pivot lookup; @param satPoint (norad) -> scene point or null; @param t real seconds */
    update({ lanes, pivotOf, satPoint, t }) {
      for (const [id, l] of links) if (!lanes.has(id)) l.beam.visible = l.glow.visible = l.pulses.visible = false;
      for (const [id, lane] of lanes) {
        const l = linkFor(id);
        const sat = satPoint(lane.pass.norad);
        const band = lane.mission?.downlink?.band ?? 'X';
        const plan = linkPlan(lane.phase, antennas.get(id), band);
        if (!sat || !plan.beam) { l.beam.visible = l.glow.visible = l.pulses.visible = false; continue; }
        const pv = pivotOf(id);
        const seg = beamSegment(pv, sat, pv.feedM ?? 0);
        dirV.set(seg.dir.x, seg.dir.y, seg.dir.z);
        const style = bandStyle(band);
        const flicker = 0.34 + 0.06 * Math.sin(t * 9 + id.length);
        for (const [m, op, col] of [[l.beam, flicker, style.hex], [l.glow, 0.11, style.glow]]) {
          m.visible = true;
          m.position.set(seg.mid.x, seg.mid.y, seg.mid.z);
          m.quaternion.setFromUnitVectors(up, dirV);
          m.scale.set(1, seg.length, 1);
          m.material.color.set(col);
          m.material.opacity = op;
        }
        l.pulses.visible = plan.uplink;
        if (plan.uplink) {
          pulseFractions(l.N, t, 0.35).forEach((u, i) => {
            tmp.set(seg.start.x + dirV.x * seg.length * u, seg.start.y + dirV.y * seg.length * u, seg.start.z + dirV.z * seg.length * u);
            l.pos.set([tmp.x, tmp.y, tmp.z], i * 3);
          });
          l.pulses.geometry.attributes.position.needsUpdate = true;
        }
      }
    },
  };
}
