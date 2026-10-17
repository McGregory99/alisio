// Pure theme logic: the dashboard follows the simulated sun unless the user picked a theme. No DOM.
const MODES = ['auto', 'light', 'dark'];
const DAY_ABOVE_DEG = 2, NIGHT_BELOW_DEG = -4; // twilight band keeps the current theme, so it never flickers

export function themeForSun(sunElDeg, previous = 'light') {
  if (sunElDeg > DAY_ABOVE_DEG) return 'light';
  if (sunElDeg < NIGHT_BELOW_DEG) return 'dark';
  return previous === 'dark' ? 'dark' : 'light';
}

export function nextThemeMode(mode) {
  const i = MODES.indexOf(mode);
  return i < 0 ? 'auto' : MODES[(i + 1) % MODES.length];
}

/** Theme to show: a manual mode wins; auto follows the sun and keeps `previous` when the sun is unknown. */
export function resolveTheme(mode, sunElDeg, previous = 'light') {
  if (mode === 'light' || mode === 'dark') return mode;
  return typeof sunElDeg === 'number' && !Number.isNaN(sunElDeg) ? themeForSun(sunElDeg, previous) : previous;
}
