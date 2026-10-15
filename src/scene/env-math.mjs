// Pure sun-driven environment parameters (no Three.js). Input: sun elevation in degrees.
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const toRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
const mix = (a, b, t) => toHex(toRgb(a).map((v, i) => v + (toRgb(b)[i] - v) * t));

const NIGHT = '#070b1a', DUSK = '#d98c66', DAY = '#8fb8d8';

export function envFromSun(elDeg) {
  const day = smooth(-6, 6, elDeg);
  const horizon = smooth(-8, 0, elDeg) * (1 - smooth(0, 14, elDeg));
  const base = mix(NIGHT, DAY, day);
  const skyHex = mix(base, DUSK, horizon * 0.6);
  return {
    skyHex,
    fogHex: mix(skyHex, '#ffffff', 0.08),
    sunIntensity: 2.4 * day,
    ambient: 0.12 + 0.55 * day,
    starOpacity: 1 - smooth(-18, -3, elDeg),
  };
}
