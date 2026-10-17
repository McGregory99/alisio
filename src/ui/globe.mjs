// Mini globe (R7.4): an orthographic globe centred on the station with day/night shading, the station's visibility
// footprint, ground tracks of the constellation and the tracks of the next served passes highlighted.
// No coastline data is shipped, so the globe shows a 30 degree graticule only.
import { h } from './dom.mjs';
import { project, visibleRuns, unproject, sunSubpoint, nightAlpha, footprintRadiusDeg, destination } from './globe-math.mjs';
import { themeColors } from './theme-colors.mjs';
import { groundTrack } from '../core/groundtrack.mjs';
import { ecfAt } from '../core/sgp4.mjs';
import { subpoint } from '../core/geo.mjs';
import { phaseAt } from '../core/lifecycle.mjs';

const SIZE = 220, R = 98, C = SIZE / 2;
const REFRESH_MS = 500;
const REBUILD_SIM_MS = 120_000; // ground tracks are rebuilt every two simulated minutes
const BEFORE_MS = 20 * 60_000, AFTER_MS = 70 * 60_000;
const NEXT_PASSES = 3;
const SHADE_PX = 2; // the night shading is computed on a coarser grid and scaled up
const REFERENCE_ALT_KM = 700; // typical Sentinel altitude, used only for the footprint ring
const FAMILY_COLOUR = { S1: '#5aa9ff', S2: '#3fbf85', S3: '#e0a64f', S5P: '#b08cff', S6: '#ff8f8f' };

export function createGlobe({ dashboard, station }) {
  const canvas = h('canvas', { role: 'img', 'aria-label': `Mini globe centred on ${station.name} with constellation ground tracks, the next passes and the station location` });
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = SIZE * dpr; canvas.height = SIZE * dpr;
  const g = canvas.getContext('2d');
  g.scale(dpr, dpr);
  const caption = h('p', { class: 'globe-cap', text: `${station.name} · -20/+70 min`, title: `Ground tracks: 20 min back, 70 min ahead. Centred on ${station.name}; 30 degree graticule, no coastlines. Ring: approximate visibility footprint of the ${station.maskDeg} degree mask at ${REFERENCE_ALT_KM} km.` });
  dashboard.mount('globe', 'Constellation', h('div', { style: 'display:flex;flex-direction:column;min-height:0;flex:1 1 auto;align-items:center' }, canvas, caption), { order: 40 });
  document.getElementById('panel-globe')?.classList.add('globe-panel');

  const centre = { latDeg: station.location.latDeg, lonDeg: station.location.lonDeg };
  const tracks = new Map(); // norad -> { sat, builtAt, runs }
  const passTracks = new Map(); // pass id -> runs
  const shade = document.createElement('canvas');
  shade.width = shade.height = SIZE / SHADE_PX;
  const sg = shade.getContext('2d');
  let acc = REFRESH_MS, shadeKey = '';

  const line = (run) => { g.beginPath(); run.forEach((p, i) => (i ? g.lineTo(C + p.x, C + p.y) : g.moveTo(C + p.x, C + p.y))); g.stroke(); };
  const disc = () => { g.beginPath(); g.arc(C, C, R, 0, Math.PI * 2); };

  function paintShade(sun, dark) {
    const n = SIZE / SHADE_PX, img = sg.createImageData(n, n);
    for (let py = 0; py < n; py += 1) {
      for (let px = 0; px < n; px += 1) {
        const p = unproject((px + 0.5) * SHADE_PX - C, (py + 0.5) * SHADE_PX - C, centre, R);
        if (!p) continue;
        const a = nightAlpha(p.latDeg, p.lonDeg, sun) * (dark ? 0.62 : 0.5);
        const i = (py * n + px) * 4;
        img.data[i] = 4; img.data[i + 1] = 10; img.data[i + 2] = 30; img.data[i + 3] = Math.round(a * 255);
      }
    }
    sg.putImageData(img, 0, 0);
  }

  function graticule(col) {
    g.strokeStyle = col.dark ? 'rgba(190,220,255,.2)' : 'rgba(255,255,255,.55)'; g.lineWidth = 0.8;
    for (let lat = -60; lat <= 60; lat += 30) for (const run of visibleRuns(Array.from({ length: 73 }, (_, i) => ({ latDeg: lat, lonDeg: -180 + i * 5 })), centre, R)) line(run);
    for (let lon = -180; lon < 180; lon += 30) for (const run of visibleRuns(Array.from({ length: 37 }, (_, i) => ({ latDeg: -90 + i * 5, lonDeg: lon })), centre, R)) line(run);
  }

  function footprint(col) {
    const r = footprintRadiusDeg(REFERENCE_ALT_KM, station.maskDeg);
    const run = Array.from({ length: 73 }, (_, i) => { const d = destination(centre, i * 5, r); return project(d.latDeg, d.lonDeg, centre, R); });
    g.strokeStyle = col.accent; g.fillStyle = col.accent; g.lineWidth = 1; g.setLineDash([3, 3]);
    g.globalAlpha = 0.9; g.beginPath(); run.forEach((p, i) => (i ? g.lineTo(C + p.x, C + p.y) : g.moveTo(C + p.x, C + p.y))); g.closePath(); g.stroke();
    g.setLineDash([]); g.globalAlpha = 0.08; g.fill(); g.globalAlpha = 1;
  }

  function nextPassRuns(schedule, simMs) {
    const out = [];
    const upcoming = schedule.assignments.filter((a) => a.status === 'assigned' && phaseAt(a.pass, simMs) !== 'delivered').slice(0, NEXT_PASSES);
    for (const a of upcoming) {
      const sat = schedule.satellites.find((s) => s.norad === a.pass.norad)?.sat;
      if (!sat) continue;
      if (!passTracks.has(a.pass.id)) { if (passTracks.size > 30) passTracks.clear(); passTracks.set(a.pass.id, visibleRuns(groundTrack(sat, a.pass.aos, a.pass.los, 20_000), centre, R)); }
      out.push({ runs: passTracks.get(a.pass.id), live: phaseAt(a.pass, simMs) === 'downlink' });
    }
    return out;
  }

  return {
    update({ simMs, dt, schedule }) {
      acc += Math.max(0, dt) * 1000;
      if (acc < REFRESH_MS) return;
      acc = 0;
      const col = themeColors();
      g.clearRect(0, 0, SIZE, SIZE);

      // Atmosphere glow, ocean sphere lit from the upper left, then the night side.
      const glow = g.createRadialGradient(C, C, R - 2, C, C, R + 9);
      glow.addColorStop(0, col.dark ? 'rgba(109,184,255,.35)' : 'rgba(22,115,214,.25)'); glow.addColorStop(1, 'rgba(109,184,255,0)');
      g.fillStyle = glow; g.beginPath(); g.arc(C, C, R + 9, 0, Math.PI * 2); g.fill();
      const ocean = g.createRadialGradient(C - 32, C - 36, 10, C, C, R);
      if (col.dark) { ocean.addColorStop(0, '#2b6aa6'); ocean.addColorStop(1, '#0f2c4d'); } else { ocean.addColorStop(0, '#d4ebfb'); ocean.addColorStop(1, '#7fb3dc'); }
      g.fillStyle = ocean; disc(); g.fill();

      const sun = sunSubpoint(new Date(simMs));
      const key = `${Math.round(sun.lonDeg * 2)}:${Math.round(sun.latDeg * 2)}:${col.dark}`;
      if (key !== shadeKey) { shadeKey = key; paintShade(sun, col.dark); }
      g.save(); disc(); g.clip(); g.imageSmoothingEnabled = true; g.drawImage(shade, 0, 0, SIZE, SIZE);
      graticule(col);
      footprint(col);

      for (const s of schedule.satellites) {
        let t = tracks.get(s.norad);
        if (!t || t.sat !== s.sat || Math.abs(simMs - t.builtAt) > REBUILD_SIM_MS) {
          t = { sat: s.sat, builtAt: simMs, runs: visibleRuns(groundTrack(s.sat, simMs - BEFORE_MS, simMs + AFTER_MS, 60_000), centre, R) };
          tracks.set(s.norad, t);
        }
        g.strokeStyle = FAMILY_COLOUR[s.mission.family] ?? col.accent; g.lineWidth = 1; g.globalAlpha = col.dark ? 0.55 : 0.7;
        for (const run of t.runs) line(run);
        g.globalAlpha = 1;
      }
      // The next served passes stand out, the one in flight brightest.
      for (const { runs, live } of nextPassRuns(schedule, simMs)) {
        g.strokeStyle = live ? col.warn : col.accent; g.lineWidth = live ? 3 : 2.2; g.lineCap = 'round';
        for (const run of runs) line(run);
      }
      g.restore();

      for (const s of schedule.satellites) {
        const ecf = ecfAt(s.sat, new Date(simMs));
        if (!ecf) continue;
        const sp = subpoint(ecf);
        const p = project(sp.latDeg, sp.lonDeg, centre, R);
        if (!p.visible) continue;
        const served = !!s.antennaId;
        g.fillStyle = served ? col.warn : (FAMILY_COLOUR[s.mission.family] ?? col.accent);
        g.strokeStyle = col.strong; g.lineWidth = 1.2;
        g.beginPath(); g.arc(C + p.x, C + p.y, served ? 4 : 2.8, 0, Math.PI * 2); g.fill(); g.stroke();
      }
      g.strokeStyle = col.dark ? 'rgba(190,220,255,.5)' : 'rgba(23,32,43,.35)'; g.lineWidth = 1; disc(); g.stroke();
      // Station marker with a halo.
      g.fillStyle = col.dark ? 'rgba(255,255,255,.25)' : 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(C, C, 8, 0, Math.PI * 2); g.fill();
      g.fillStyle = col.bad; g.strokeStyle = '#fff'; g.lineWidth = 1.8; g.beginPath(); g.arc(C, C, 4.2, 0, Math.PI * 2); g.fill(); g.stroke();
    },
  };
}
