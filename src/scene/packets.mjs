// Packets and pipeline flow (R5.5). Instanced packets run satellite -> dish while a pass downlinks, then
// campus -> egress -> off-site after LOS. Four generic stage labels (L0, L1/L2, archive, distribution) sit at the
// off-site end of the egress; a stage is bright while some finished pass is in it. Animation uses real time.
import { skyPoint } from './sky-math.mjs';
import { pointOnPolyline, flowFractions } from './packets-math.mjs';
import { registerAnchor } from './callouts-registry.mjs';
import { STAGES, pipelineStageAt } from '../core/pipeline.mjs';

const MAX = 320, PER_DOWNLINK = 14, PER_EGRESS = 10, SPEED = 0.35;

export function createPackets({ THREE, scene, pivotOf, egress }) {
  const mesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1.6, 8, 6),
    new THREE.MeshBasicMaterial({ color: '#7fe0ff', fog: false }),
    MAX,
  );
  mesh.frustumCulled = false;
  mesh.count = 0;
  scene.add(mesh);
  const dummy = new THREE.Object3D();
  let t = 0;

  // One compact stage chip above the egress label (never stacked sprites): the stage a finished pass is in is bold.
  const activeStages = new Set();
  if (egress.path) {
    const end = egress.path[egress.path.length - 1];
    registerAnchor(scene, {
      id: 'pipeline-stages', maxDist: 1400,
      point: () => ({ x: end.x, y: end.y + 44, z: end.z }),
      content: () => ({ title: 'Pipeline (illustrative)', tone: 'note', priority: 30, lines: STAGES.map((s) => ({ text: s.label, on: activeStages.has(s.id) })) }),
    });
  }

  return {
    mesh, activeStages,
    update({ dt, simMs, schedule }) {
      t += dt;
      let n = 0;
      const put = (p) => { if (n >= MAX) return; dummy.position.set(p.x, p.y, p.z); dummy.updateMatrix(); mesh.setMatrixAt(n++, dummy.matrix); };

      // satellite -> dish while the pass downlinks
      for (const [antennaId, lane] of schedule.lanes) {
        if (lane.phase !== 'downlink') continue;
        const s = schedule.satellites.find((x) => x.norad === lane.pass.norad);
        if (!s || s.elDeg == null) continue;
        const pivot = pivotOf(antennaId);
        const from = skyPoint(pivot, s.azDeg, s.elDeg);
        const path = [from, pivot];
        for (const u of flowFractions(PER_DOWNLINK, t, SPEED)) put(pointOnPolyline(path, u));
      }

      // campus -> egress -> off-site for finished passes, and the stage highlight
      const active = new Set();
      for (const f of schedule.finished) {
        const st = pipelineStageAt(f.pass, f.mission, simMs);
        if (!st) continue;
        active.add(st.id);
        if (st.egress && egress.path) for (const u of flowFractions(PER_EGRESS, t, SPEED * 0.6)) put(pointOnPolyline(egress.path, u));
      }
      activeStages.clear();
      for (const id of active) activeStages.add(id);

      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
