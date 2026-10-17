// Weather selector (R8.1, R8.2): four illustrative presets as native radio inputs (keyboard operable), the
// "illustrative, not a live feed" label, and a status line with wind, fade and stowed antennas.
// A compact chip with the current preset and wind also sits in the top bar.
import { h, setText } from './dom.mjs';
import { icon } from './icons.mjs';
import { weatherPanel, weatherChip } from './weather-model.mjs';

const CHIP_ICON = { clear: 'sun', calima: 'haze', 'atlantic-rain': 'rain', 'trade-wind': 'wind' };

export function createWeatherSelect({ dashboard, weather, station }) {
  const initial = weatherPanel(weather.current(), station);
  const inputs = new Map();
  const group = h('div', { role: 'radiogroup', 'aria-label': 'Weather preset (illustrative)', class: 'weather-options' });
  for (const o of initial.options) {
    const input = h('input', { type: 'radio', name: 'weather-preset', value: o.id });
    input.addEventListener('change', () => { if (input.checked) weather.set(o.id); });
    inputs.set(o.id, input);
    group.append(h('label', {}, input, h('span', { text: o.label })));
  }
  const notice = h('p', { class: 'note', text: initial.notice });
  const status = h('p', { class: 'note', role: 'status', 'aria-live': 'polite' });
  dashboard.mount('weather', 'Weather (illustrative)', h('div', { class: 'weather' }, group, notice, status), { order: 25 });

  const chipIcon = h('span', { style: 'display:contents' }), chipLabel = h('b'), chipWind = h('span'), chipNote = h('span', { class: 'ill', text: ' · illustrative' });
  const chip = h('div', { class: 'wx-chip', title: 'Weather is an illustration you choose, not a live feed.' }, chipIcon, h('div', {}, chipLabel, h('span', {}, chipWind, chipNote)));
  dashboard.addChip?.(chip);
  let shownIcon = null;

  const render = () => {
    const id = weather.current();
    const m = weatherPanel(id, station);
    for (const [oid, input] of inputs) input.checked = oid === id;
    setText(status, m.status);
    const c = weatherChip(id);
    setText(chipLabel, c.label); setText(chipWind, c.wind); chipNote.hidden = false;
    if (shownIcon !== id) { shownIcon = id; chipIcon.replaceChildren(icon(CHIP_ICON[id] ?? 'sun')); }
  };
  render();
  weather.onChange(render);
  return { update() {} };
}
