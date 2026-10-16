import test from 'node:test';
import assert from 'node:assert/strict';
import { WEATHER_NOTICE, weatherPanel, fadeLine, passWeatherNote } from '../../src/ui/weather-model.mjs';
import { MASPALOMAS } from '../../src/data/stations/maspalomas.mjs';

test('the selector is labelled illustrative and not a live feed (R8.1)', () => {
  assert.match(WEATHER_NOTICE, /illustrative, not a live feed/i);
});

test('panel model lists the four presets and marks the selected one', () => {
  const m = weatherPanel('calima', MASPALOMAS);
  assert.deepEqual(m.options.map((o) => o.id), ['clear', 'calima', 'atlantic-rain', 'trade-wind']);
  assert.deepEqual(m.options.filter((o) => o.selected).map((o) => o.id), ['calima']);
  assert.equal(m.notice, WEATHER_NOTICE);
  assert.deepEqual(m.stowed, []);
});

test('strong trade wind lists every stowed antenna in the status line', () => {
  const m = weatherPanel('trade-wind', MASPALOMAS);
  assert.deepEqual(m.stowed, MASPALOMAS.antennas.map((a) => a.id));
  assert.match(m.status, /stowed/i);
  assert.match(m.status, /110 km\/h/);
});

test('fade line shows the X-band fade in dB and the illustrative label', () => {
  assert.match(fadeLine('clear'), /0\.0 dB/);
  assert.match(fadeLine('atlantic-rain'), /2\.4 dB/);
  assert.match(fadeLine('atlantic-rain'), /illustrative, not a live feed/i);
});

test('pass weather note explains unserved and degraded passes, and is empty otherwise', () => {
  assert.match(passWeatherNote({ weather: 'stowed' }), /stowed.*wind/i);
  assert.match(passWeatherNote({ weather: 'degraded', fadeDb: 2.4 }), /2\.4 dB/);
  assert.equal(passWeatherNote({ status: 'assigned' }), '');
  assert.equal(passWeatherNote(undefined), '');
});
