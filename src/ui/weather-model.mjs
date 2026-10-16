// Pure view model for the weather selector and the detail panel lines (R8.1, R8.2). No DOM.
import { WEATHER_PRESETS, weatherEffects, isStowed } from '../core/weather.mjs';

export const WEATHER_NOTICE = 'Weather is an illustration you choose: illustrative, not a live feed.';

export function fadeLine(presetId) {
  const { xBandFadeDb } = weatherEffects(presetId);
  return `X-band weather fade: ${xBandFadeDb.toFixed(1)} dB (illustrative, not a live feed).`;
}

/** @returns {{options: Array<{id,label,selected}>, notice: string, stowed: string[], status: string}} */
export function weatherPanel(presetId, station) {
  const w = weatherEffects(presetId);
  const stowed = (station.antennas ?? []).filter((a) => isStowed(presetId, null, a)).map((a) => a.id);
  const wind = `Wind ${Math.round(w.windKmh)} km/h.`;
  const status = stowed.length
    ? `${wind} Antennas stowed: ${stowed.join(', ')}. Affected passes are unserved.`
    : `${wind} ${fadeLine(presetId)}`;
  return {
    options: WEATHER_PRESETS.map((p) => ({ id: p.id, label: p.label, selected: p.id === presetId })),
    notice: WEATHER_NOTICE, stowed, status,
  };
}

/** One sentence for an assignment affected by the weather, or an empty string. */
export function passWeatherNote(assignment) {
  if (assignment?.weather === 'stowed') return 'Unserved: antenna stowed in strong wind (illustrative).';
  if (assignment?.weather === 'degraded') return `Degraded: ${assignment.fadeDb.toFixed(1)} dB X-band fade (illustrative).`;
  return '';
}
