// Polar sky plot canvas (R7.3): rings, cardinal points, the pass track and the satellite marker. Colours follow the theme.
import { polarPoint } from './skyplot-math.mjs';
import { themeColors } from './theme-colors.mjs';

const SIZE = 220;

export function createSkyplot() {
  const canvas = document.createElement('canvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = SIZE * dpr; canvas.height = SIZE * dpr;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Polar sky plot of the satellite pass');
  const g = canvas.getContext('2d');
  g.scale(dpr, dpr);
  const c = SIZE / 2, R = c - 20;

  function base(col) {
    g.clearRect(0, 0, SIZE, SIZE);
    g.fillStyle = col.dark ? 'rgba(255,255,255,.04)' : 'rgba(23,32,43,.03)';
    g.beginPath(); g.arc(c, c, R, 0, Math.PI * 2); g.fill();
    g.strokeStyle = col.hair2; g.fillStyle = col.ink3; g.lineWidth = 1;
    for (const el of [0, 30, 60]) { g.beginPath(); g.arc(c, c, (R * (90 - el)) / 90, 0, Math.PI * 2); g.stroke(); }
    g.beginPath(); g.moveTo(c - R, c); g.lineTo(c + R, c); g.moveTo(c, c - R); g.lineTo(c, c + R); g.stroke();
    g.font = '600 11px ui-monospace, Menlo, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('N', c, c - R - 10); g.fillText('S', c, c + R + 10); g.fillText('E', c + R + 11, c); g.fillText('W', c - R - 11, c);
  }

  return {
    canvas,
    /** @param {Array<{azDeg:number,elDeg:number}>} track pass samples; @param {{azDeg:number,elDeg:number}|null} marker */
    draw(track, marker) {
      const col = themeColors();
      base(col);
      const pts = track.filter((s) => s.elDeg >= 0).map((s) => polarPoint(s.azDeg, s.elDeg, R));
      if (pts.length > 1) {
        g.strokeStyle = col.accent; g.lineWidth = 2.2; g.lineJoin = 'round'; g.beginPath();
        pts.forEach((p, i) => (i ? g.lineTo(c + p.x, c + p.y) : g.moveTo(c + p.x, c + p.y)));
        g.stroke();
        g.fillStyle = col.ok; g.beginPath(); g.arc(c + pts[0].x, c + pts[0].y, 3.5, 0, Math.PI * 2); g.fill(); // AOS
        const l = pts[pts.length - 1];
        g.fillStyle = col.bad; g.beginPath(); g.arc(c + l.x, c + l.y, 3.5, 0, Math.PI * 2); g.fill(); // LOS
      }
      if (marker && marker.elDeg >= 0) {
        const p = polarPoint(marker.azDeg, marker.elDeg, R);
        g.fillStyle = col.warn; g.strokeStyle = col.strong; g.lineWidth = 2;
        g.beginPath(); g.arc(c + p.x, c + p.y, 5.5, 0, Math.PI * 2); g.fill(); g.stroke();
      }
    },
  };
}
