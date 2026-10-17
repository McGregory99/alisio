// Small cached canvas textures shared by the glow effects (cheap stand-in for a bloom pass).
const cache = new WeakMap();

function make(THREE, key, draw, size) {
  let per = cache.get(THREE);
  if (!per) { per = new Map(); cache.set(THREE, per); }
  if (!per.has(key)) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    draw(c.getContext('2d'), size);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    per.set(key, t);
  }
  return per.get(key);
}

/** Soft white radial glow, tinted through the material colour. */
export const glowTexture = (THREE) => make(THREE, 'glow', (g, s) => {
  const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, s, s);
}, 128);

/** Solar array cells: dark blue with a fine grid. */
export const solarTexture = (THREE) => make(THREE, 'solar', (g, s) => {
  g.fillStyle = '#1d3a78'; g.fillRect(0, 0, s, s);
  g.strokeStyle = '#6f8fd0'; g.lineWidth = 2;
  for (let i = 0; i <= 8; i++) { const p = (i / 8) * s; g.beginPath(); g.moveTo(p, 0); g.lineTo(p, s); g.moveTo(0, p); g.lineTo(s, p); g.stroke(); }
}, 128);
