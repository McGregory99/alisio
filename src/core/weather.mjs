// Illustrative site weather (R8.1, R8.2, A3). A preset is a user selection, never a live feed: nothing here reads
// a forecast, a sensor or the network. Pure functions only, no DOM and no Three.js.
//
// Documented thresholds (all illustrative):
//  - X-band fade: at most MAX_FADE_DB (3 dB), 0 dB when clear.
//  - Wind stow: an antenna stows when the wind is at or above its own `stowWindKmh`, or WIND_STOW_KMH when the
//    antenna record has none. The strong trade wind preset blows above every Maspalomas antenna threshold.

export const MAX_FADE_DB = 3;
export const WIND_STOW_KMH = 90;

const NEUTRAL = Object.freeze({
  tintHex: '#8fb8d8', tintAmount: 0, // colour the sky and fog drift toward
  fogNearScale: 1, fogFarScale: 1, // multipliers on the sun-driven fog distances
  sunScale: 1, ambientScale: 1, // multipliers on the sun-driven light
  cloudCover: 0, rain: 0, dust: 0, windStreaks: 0, // 0..1 intensities for the scene effects
});

const def = (id, label, summary, visual, xBandFadeDb, windKmh) => Object.freeze({
  id, label, summary, illustrative: true, xBandFadeDb, windKmh, visual: Object.freeze({ ...NEUTRAL, ...visual }),
});

export const WEATHER_PRESETS = Object.freeze([
  def('clear', 'Clear', 'Clear sky, light breeze.', {}, 0, 12),
  def('calima', 'Calima dust haze', 'Saharan dust haze: warm, thick air and a dimmer sun.',
    { tintHex: '#c9a070', tintAmount: 0.55, fogNearScale: 0.25, fogFarScale: 0.4, sunScale: 0.6, ambientScale: 0.9, dust: 0.85 }, 0.4, 25),
  def('atlantic-rain', 'Atlantic cloud and rain', 'Low Atlantic cloud and rain: grey light and a small X-band fade.',
    { tintHex: '#6f7d8c', tintAmount: 0.6, fogNearScale: 0.35, fogFarScale: 0.55, sunScale: 0.3, ambientScale: 0.85, cloudCover: 0.9, rain: 0.8 }, 2.4, 35),
  def('trade-wind', 'Strong trade wind', 'Strong trade wind: clear and gusty, antennas stow.',
    { tintHex: '#a6c4dc', tintAmount: 0.15, fogFarScale: 0.9, windStreaks: 1 }, 0, 110),
]);

const BY_ID = new Map(WEATHER_PRESETS.map((p) => [p.id, p]));

function preset(id) {
  const p = BY_ID.get(id);
  if (!p) throw new Error(`Unknown weather preset: ${id}`);
  return p;
}

/** @returns {{id, label, summary, illustrative: true, visual: object, xBandFadeDb: number, windKmh: number}} */
export function weatherEffects(presetId) {
  return preset(presetId);
}

/** Share of the nominal payload rate that survives the X-band fade (illustrative): 10^(-fade/10). */
export function rateFactor(presetId) {
  return 10 ** (-preset(presetId).xBandFadeDb / 10);
}

/** True when the antenna is commanded to stow. `windKmh` overrides the preset wind (null uses the preset's). */
export function isStowed(presetId, windKmh, antenna) {
  const wind = windKmh ?? preset(presetId).windKmh;
  return wind >= (antenna?.stowWindKmh ?? WIND_STOW_KMH);
}

/** Scheduler availability predicate (T6.2 injection point): an antenna that is stowed cannot take a pass. */
export function weatherAvailability(getPresetId) {
  return (antenna) => !isStowed(getPresetId(), null, antenna);
}

/**
 * Applies the weather to a live schedule without mutating it. Passes on stowed antennas become unserved
 * (`weather: 'stowed'`, no lane, no packets); served passes under a fade are `weather: 'degraded'` with `fadeDb`.
 */
export function applyWeather(schedule, presetId, station) {
  const { xBandFadeDb } = preset(presetId);
  const stowed = new Set((station.antennas ?? []).filter((a) => isStowed(presetId, null, a)).map((a) => a.id));
  if (stowed.size === 0 && xBandFadeDb === 0) return schedule;
  const assignments = schedule.assignments.map((a) => {
    if (a.antennaId && stowed.has(a.antennaId)) return { ...a, antennaId: null, status: 'unassigned', weather: 'stowed' };
    if (a.status === 'assigned' && xBandFadeDb > 0) return { ...a, weather: 'degraded', fadeDb: xBandFadeDb };
    return a;
  });
  const lanes = new Map([...schedule.lanes].filter(([id]) => !stowed.has(id)));
  const satellites = schedule.satellites.map((s) => (s.antennaId && stowed.has(s.antennaId) ? { ...s, antennaId: null } : s));
  return { ...schedule, assignments, lanes, satellites };
}

/** The selected preset, shared by the scene, the selector and the detail panel. Defaults to clear. */
export function createWeatherState(initial = 'clear') {
  let id = preset(initial).id;
  const listeners = new Set();
  return {
    current: () => id,
    effects: () => preset(id),
    set(next) {
      preset(next);
      if (next === id) return;
      id = next;
      for (const fn of listeners) fn(id);
    },
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
}
