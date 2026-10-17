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

export const BASE_FOG = Object.freeze({ near: 500, far: 2600 });

/**
 * Modulates the sun-driven parameters with an illustrative weather look (core/weather `visual`).
 * The tint is darkened by the daylight level, so weather never brightens the night sky.
 */
export function weatherEnv(e, visual, base = BASE_FOG) {
  const day = Math.min(1, e.sunIntensity / 2.4);
  const tint = mix(NIGHT, visual.tintHex, day);
  const skyHex = visual.tintAmount > 0 ? mix(e.skyHex, tint, visual.tintAmount) : e.skyHex;
  const fogHex = visual.tintAmount > 0 ? mix(e.fogHex, tint, Math.min(1, visual.tintAmount * 1.2)) : e.fogHex;
  const hidden = Math.min(1, visual.cloudCover * 0.9 + visual.dust * 0.6);
  return {
    ...e,
    skyHex, fogHex,
    sunIntensity: e.sunIntensity * visual.sunScale,
    ambient: e.ambient * visual.ambientScale,
    starOpacity: e.starOpacity * (1 - hidden),
    fogNear: base.near * visual.fogNearScale,
    fogFar: base.far * visual.fogFarScale,
  };
}

/** Subtle full-frame grade: tint colour/alpha and vignette strength from the sun elevation (all cheap, CSS-driven). */
export function gradeFromSun(elDeg) {
  const golden = Math.exp(-((elDeg - 3) * (elDeg - 3)) / 60); // peaks near sunrise/sunset
  const night = 1 - smooth(-12, -2, elDeg);
  const tintHex = night > golden ? '#3a56a8' : '#ff9a4a';
  return {
    tintHex,
    tintAlpha: Math.min(0.22, 0.17 * Math.max(golden, night) + 0.01),
    vignette: 0.18 + 0.2 * night,
  };
}

/** Strength 0..1 of the sun glow painted on the sky dome: strongest low in the sky, faint at noon, none at night. */
export function sunGlowStrength(elDeg) {
  if (elDeg < -4) return 0;
  return smooth(-4, 2, elDeg) * (0.4 + 0.6 * (1 - smooth(2, 30, elDeg)));
}

/** Sky dome gradient: zenith colour and a hazy horizon colour derived from the fog colour. */
export function domeColors(skyHex, fogHex, day = 1) {
  return { top: skyHex, bottom: mix(fogHex, '#ffffff', 0.12 * day) };
}
