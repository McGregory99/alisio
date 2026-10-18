// Orbit loops and live satellite markers of the space view. One LineLoop per satellite (rebuilt only when the
// simulated clock moves more than ~10 minutes), one Points object for all markers (positions refreshed per frame).
import { toSatrec, propagateAt } from '../core/sgp4.mjs';
import { orbitLoopEci } from '../core/orbit-loop.mjs';
import { eciToScene, shouldRebuildOrbits } from './space-math.mjs';

// Same family colours as the mini globe (ui/globe.mjs).
const FAMILY_COLOUR = { S1: '#5aa9ff', S2: '#3fbf85', S3: '#e0a64f', S5P: '#b08cff', S6: '#ff8f8f' };
const SAMPLES = 150;

export function createSpaceOrbits({ THREE, parent, missions, glowTexture }) {
  const byNorad = new Map(missions.map((m) => [m.norad, m]));
  const group = new THREE.Group();
  parent.add(group);
  let sats = [];            // [{ norad, mission, sat, line, colour }]
  let recordsRef = null, lastBuildMs = null;
  let markers = null, selectedNorad = null;
  const pos = [];           // scene positions of the markers, in `sats` order (null when propagation failed)

  const selMarker = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3)),
    new THREE.PointsMaterial({ color: '#ffffff', size: 30, sizeAttenuation: false, map: glowTexture, transparent: true, depthWrite: false }),
  );
  selMarker.visible = false; selMarker.frustumCulled = false;
  group.add(selMarker);

  function dispose() {
    for (const s of sats) { group.remove(s.line); s.line.geometry.dispose(); s.line.material.dispose(); }
    if (markers) { group.remove(markers); markers.geometry.dispose(); markers.material.dispose(); }
    sats = []; markers = null;
  }

  function build(records, simMs) {
    dispose();
    for (const rec of records) {
      const mission = byNorad.get(rec.NORAD_CAT_ID);
      const sat = toSatrec(rec);
      if (!mission || sat.failed) continue;
      const loop = orbitLoopEci(sat, simMs, SAMPLES);
      if (!loop) continue;
      const arr = new Float32Array(loop.points.length);
      for (let i = 0; i < SAMPLES; i++) { const p = eciToScene({ x: loop.points[i * 3], y: loop.points[i * 3 + 1], z: loop.points[i * 3 + 2] }); arr[i * 3] = p.x; arr[i * 3 + 1] = p.y; arr[i * 3 + 2] = p.z; }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      const colour = FAMILY_COLOUR[mission.family] ?? '#9fd0ff';
      const line = new THREE.LineLoop(geo, new THREE.LineBasicMaterial({ color: colour, transparent: true, opacity: 0.6, depthWrite: false }));
      line.frustumCulled = false;
      group.add(line);
      sats.push({ norad: rec.NORAD_CAT_ID, mission, sat, line, colour });
    }
    const cols = new Float32Array(sats.length * 3);
    sats.forEach((s, i) => { const c = new THREE.Color(s.colour); cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b; });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(sats.length * 3), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    markers = new THREE.Points(geo, new THREE.PointsMaterial({ size: 15, sizeAttenuation: false, map: glowTexture, vertexColors: true, transparent: true, depthWrite: false }));
    markers.frustumCulled = false;
    group.add(markers);
    pos.length = sats.length;
    lastBuildMs = simMs;
    styleSelection();
  }

  function styleSelection() {
    for (const s of sats) s.line.material.opacity = selectedNorad == null ? 0.6 : s.norad === selectedNorad ? 1 : 0.3;
  }

  return {
    group,
    count: () => sats.length,
    /** Satellites with their current scene position: [{ norad, mission, position|null }] (valid after `update`). */
    items: () => sats.map((s, i) => ({ norad: s.norad, mission: s.mission, position: pos[i] })),
    setSelected(norad) { if (norad !== selectedNorad) { selectedNorad = norad; styleSelection(); } },
    /** Rebuild the loops when due, then move the markers to the satellites' positions at `simMs`. */
    update(records, simMs) {
      if (shouldRebuildOrbits({ lastBuildMs, nowMs: simMs, sameRecords: records === recordsRef })) { recordsRef = records; build(records, simMs); }
      const attr = markers.geometry.attributes.position;
      const date = new Date(simMs);
      sats.forEach((s, i) => {
        const pv = propagateAt(s.sat, date);
        if (!pv) { pos[i] = null; attr.setXYZ(i, 0, 0, 0); return; }
        const p = eciToScene(pv.position);
        pos[i] = p; attr.setXYZ(i, p.x, p.y, p.z);
      });
      attr.needsUpdate = true;
      const sel = selectedNorad == null ? -1 : sats.findIndex((s) => s.norad === selectedNorad);
      selMarker.visible = sel >= 0 && pos[sel] != null;
      if (selMarker.visible) { selMarker.geometry.attributes.position.setXYZ(0, pos[sel].x, pos[sel].y, pos[sel].z); selMarker.geometry.attributes.position.needsUpdate = true; }
    },
    dispose,
  };
}
