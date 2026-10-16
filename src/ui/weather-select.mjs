// Weather selector (R8.1, R8.2): four illustrative presets as native radio inputs (keyboard operable), the
// "illustrative, not a live feed" label, and a status line with wind, fade and stowed antennas.
import { h, setText } from './dom.mjs';
import { weatherPanel } from './weather-model.mjs';

export function createWeatherSelect({ dashboard, weather, station }) {
  const initial = weatherPanel(weather.current(), station);
  const inputs = new Map();
  const group = h('div', { role: 'radiogroup', 'aria-label': 'Weather preset (illustrative)', class: 'weather-options' });
  for (const o of initial.options) {
    const input = h('input', { type: 'radio', name: 'weather-preset', value: o.id });
    input.addEventListener('change', () => { if (input.checked) weather.set(o.id); });
    inputs.set(o.id, input);
    group.append(h('label', {}, input, h('span', { text: ` ${o.label}` })));
  }
  const notice = h('p', { class: 'note', text: initial.notice });
  const status = h('p', { class: 'note', role: 'status', 'aria-live': 'polite' });
  dashboard.mount('weather', 'Weather (illustrative)', h('div', { class: 'weather' }, group, notice, status), { order: 25 });

  const render = () => {
    const m = weatherPanel(weather.current(), station);
    for (const [id, input] of inputs) input.checked = id === weather.current();
    setText(status, m.status);
  };
  render();
  weather.onChange(render);
  return { update() {} };
}
