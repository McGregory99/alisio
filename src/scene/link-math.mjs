// Pure link-visual helpers (no Three.js): beam geometry between a dish feed and a satellite direction point,
// band colours, which links are visible in a pass phase, and satellite model variants per mission family.
const len = (v) => Math.hypot(v.x, v.y, v.z);

/** Segment from `a` to `b`, optionally starting `startOffset` metres along the direction (the feed sits ahead of the pivot). */
export function beamSegment(a, b, startOffset = 0) {
  const d = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
  const total = len(d);
  const dir = total > 1e-9 ? { x: d.x / total, y: d.y / total, z: d.z / total } : { x: 0, y: 1, z: 0 };
  const off = Math.min(startOffset, total);
  const start = { x: a.x + dir.x * off, y: a.y + dir.y * off, z: a.z + dir.z * off };
  const length = total - off;
  return { start, length, dir, mid: { x: start.x + dir.x * length / 2, y: start.y + dir.y * length / 2, z: start.z + dir.z * length / 2 } };
}

const BANDS = { X: { hex: '#4fd8ff', glow: '#2a9fff' }, S: { hex: '#ffb454', glow: '#ff8a2a' } };
export const bandStyle = (band) => BANDS[band] ?? BANDS.X;

/** What to draw for an antenna in a pass phase: the payload beam, and the S-band TT&C uplink pulses. */
export function linkPlan(phase, antenna, band) {
  const downlink = phase === 'downlink';
  const ttc = (antenna?.roles ?? []).includes('ttc') && (antenna?.bands?.tx ?? []).includes('S');
  return { beam: downlink, uplink: downlink && ttc, band };
}

const VARIANTS = {
  S1: { wings: 2, panels: 2, radar: true, bus: 1.0 },
  S2: { wings: 1, panels: 3, radar: false, bus: 1.0 },
  S3: { wings: 1, panels: 2, radar: false, bus: 1.15 },
  S5P: { wings: 1, panels: 2, radar: false, bus: 0.9 },
  S6: { wings: 2, panels: 2, radar: false, bus: 1.1 },
  default: { wings: 2, panels: 2, radar: false, bus: 1.0 },
};
export const satVariant = (family) => VARIANTS[family] ?? VARIANTS.default;

/** Evenly spaced positions in [0,1) along a link, advancing with `t` seconds at `speed` link-lengths per second. */
export function pulseFractions(n, t, speed = 0.5) {
  const out = [];
  for (let i = 0; i < n; i++) out.push((((i / n + t * speed) % 1) + 1) % 1);
  return out;
}
