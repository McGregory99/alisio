// Mini globe (R7.4): constellation ground tracks and the station marker on an orthographic globe centred on the station.
// No coastline data is shipped, so the globe shows a 30 degree graticule only.
import { h } from './dom.mjs';
import { project, visibleRuns } from './globe-math.mjs';
import { groundTrack } from '../core/groundtrack.mjs';
import { ecfAt } from '../core/sgp4.mjs';
import { subpoint } from '../core/geo.mjs';

const SIZE = 220, R = 100, C = SIZE / 2;
const REFRESH_MS = 500;
const REBUILD_SIM_MS = 120_000; // ground tracks are rebuilt every two simulated minutes
const BEFORE_MS = 20 * 60_000, AFTER_MS = 70 * 60_000;
const FAMILY_COLOUR = { S1: '#9fd0ff', S2: '#58c98a', S3: '#e0a64f', S5P: '#c79bff', S6: '#ff8f8f' };

export function createGlobe({ dashboard, station }) {
  const canvas = h('canvas', { role: 'img', 'aria-label': 'Mini globe with constellation ground tracks and the station location' });
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = SIZE * dpr; canvas.height = SIZE * dpr;
  canvas.style.cssText = 'display:block;width:100%;max-width:220px;aspect-ratio:1;margin:0 auto';
  const g = canvas.getContext('2d');
  g.scale(dpr, dpr);
  dashboard.mount('globe', 'Constellation', h('div', {}, canvas,
    h('p', { class: 'note muted', text: `Ground tracks: 20 min back, 70 min ahead. Centred on ${station.name}; 30 degree graticule, no coastlines.` })), { order: 40 });

  const centre = { latDeg: station.location.latDeg, lonDeg: station.location.lonDeg };
  const tracks = new Map(); // norad -> { sat, builtAt, runs }
  let acc = REFRESH_MS;

  const line = (run) => { g.beginPath(); run.forEach((p, i) => (i ? g.lineTo(C + p.x, C + p.y) : g.moveTo(C + p.x, C + p.y))); g.stroke(); };

  function graticule() {
    g.strokeStyle = 'rgba(159,208,255,.18)'; g.lineWidth = 1;
    for (let lat = -60; lat <= 60; lat += 30) for (const run of visibleRuns(Array.from({ length: 73 }, (_, i) => ({ latDeg: lat, lonDeg: -180 + i * 5 })), centre, R)) line(run);
    for (let lon = -180; lon < 180; lon += 30) for (const run of visibleRuns(Array.from({ length: 37 }, (_, i) => ({ latDeg: -90 + i * 5, lonDeg: lon })), centre, R)) line(run);
  }

  return {
    update({ simMs, dt, schedule }) {
      acc += Math.max(0, dt) * 1000;
      if (acc < REFRESH_MS) return;
      acc = 0;
      g.clearRect(0, 0, SIZE, SIZE);
      g.fillStyle = 'rgba(20,40,70,.55)'; g.beginPath(); g.arc(C, C, R, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(159,208,255,.4)'; g.beginPath(); g.arc(C, C, R, 0, Math.PI * 2); g.stroke();
      graticule();

      for (const s of schedule.satellites) {
        let t = tracks.get(s.norad);
        if (!t || t.sat !== s.sat || Math.abs(simMs - t.builtAt) > REBUILD_SIM_MS) {
          t = { sat: s.sat, builtAt: simMs, runs: visibleRuns(groundTrack(s.sat, simMs - BEFORE_MS, simMs + AFTER_MS, 60_000), centre, R) };
          tracks.set(s.norad, t);
        }
        g.strokeStyle = FAMILY_COLOUR[s.mission.family] ?? '#9fd0ff'; g.lineWidth = 1.2; g.globalAlpha = .8;
        for (const run of t.runs) line(run);
        g.globalAlpha = 1;
        const ecf = ecfAt(s.sat, new Date(simMs));
        if (!ecf) continue;
        const sp = subpoint(ecf);
        const p = project(sp.latDeg, sp.lonDeg, centre, R);
        if (!p.visible) continue;
        g.fillStyle = s.antennaId ? '#ffe28a' : (FAMILY_COLOUR[s.mission.family] ?? '#9fd0ff');
        g.beginPath(); g.arc(C + p.x, C + p.y, s.antennaId ? 3.5 : 2.5, 0, Math.PI * 2); g.fill();
      }
      g.strokeStyle = '#ffffff'; g.lineWidth = 1.5; g.beginPath(); g.arc(C, C, 4.5, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#e8eef7'; g.font = '11px system-ui, sans-serif'; g.textAlign = 'left'; g.fillText(station.name, C + 8, C - 6);
    },
  };
}
