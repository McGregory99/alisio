// Polar sky plot canvas (R7.3): rings, cardinal points, the pass track and the satellite marker.
import { polarPoint } from './skyplot-math.mjs';

const SIZE = 220;

export function createSkyplot() {
  const canvas = document.createElement('canvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = SIZE * dpr; canvas.height = SIZE * dpr;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Polar sky plot of the satellite pass');
  const g = canvas.getContext('2d');
  g.scale(dpr, dpr);
  const c = SIZE / 2, R = c - 18;

  function base() {
    g.clearRect(0, 0, SIZE, SIZE);
    g.strokeStyle = 'rgba(159,208,255,.25)'; g.fillStyle = '#9fb3cc'; g.lineWidth = 1;
    for (const el of [0, 30, 60]) { g.beginPath(); g.arc(c, c, (R * (90 - el)) / 90, 0, Math.PI * 2); g.stroke(); }
    g.beginPath(); g.moveTo(c - R, c); g.lineTo(c + R, c); g.moveTo(c, c - R); g.lineTo(c, c + R); g.stroke();
    g.font = '11px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('N', c, c - R - 9); g.fillText('S', c, c + R + 9); g.fillText('E', c + R + 10, c); g.fillText('W', c - R - 10, c);
  }

  return {
    canvas,
    /** @param {Array<{azDeg:number,elDeg:number}>} track pass samples; @param {{azDeg:number,elDeg:number}|null} marker */
    draw(track, marker) {
      base();
      const pts = track.filter((s) => s.elDeg >= 0).map((s) => polarPoint(s.azDeg, s.elDeg, R));
      if (pts.length > 1) {
        g.strokeStyle = '#9fd0ff'; g.lineWidth = 2; g.beginPath();
        pts.forEach((p, i) => (i ? g.lineTo(c + p.x, c + p.y) : g.moveTo(c + p.x, c + p.y)));
        g.stroke();
        g.fillStyle = '#58c98a'; g.beginPath(); g.arc(c + pts[0].x, c + pts[0].y, 3, 0, Math.PI * 2); g.fill(); // AOS
        const l = pts[pts.length - 1];
        g.fillStyle = '#e5736b'; g.beginPath(); g.arc(c + l.x, c + l.y, 3, 0, Math.PI * 2); g.fill(); // LOS
      }
      if (marker && marker.elDeg >= 0) {
        const p = polarPoint(marker.azDeg, marker.elDeg, R);
        g.fillStyle = '#ffe28a'; g.strokeStyle = '#0b1220'; g.lineWidth = 1.5;
        g.beginPath(); g.arc(c + p.x, c + p.y, 5, 0, Math.PI * 2); g.fill(); g.stroke();
      }
    },
  };
}
