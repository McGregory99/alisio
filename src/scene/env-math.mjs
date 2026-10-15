// Pure sun-driven environment parameters (no Three.js). Input: sun elevation in degrees.
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const toRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
const mix = (a, b, t) => toHex(toRgb(a).map((v, i) => v + (toRgb(b)[i] - v) * t));

// Night sky stays a visible deep blue (not black) so the campus reads at any real local time (Amendment 7).
const NIGHT = '#101a38', DUSK = '#d98c66', DAY = '#8fb8d8';

export const NIGHT_AMBIENT_FLOOR = 0.4; // hemisphere light at night (moon and sky glow)
export const MOON_FLOOR = 0.55; // directional moonlight, a cool fill so forms and shadows stay readable

export function envFromSun(elDeg) {
  const day = smooth(-6, 6, elDeg);
  const horizon = smooth(-8, 0, elDeg) * (1 - smooth(0, 14, elDeg));
  const base = mix(NIGHT, DAY, day);
  const skyHex = mix(base, DUSK, horizon * 0.6);
  return {
    skyHex,
    fogHex: mix(skyHex, '#ffffff', 0.08),
    sunIntensity: 2.4 * day,
    ambient: NIGHT_AMBIENT_FLOOR + (0.67 - NIGHT_AMBIENT_FLOOR) * day,
    moonIntensity: MOON_FLOOR * (1 - day) + 0.1 * day,
    stationLights: 1 - smooth(-2, 8, elDeg),
    starOpacity: 1 - smooth(-18, -3, elDeg),
  };
}
