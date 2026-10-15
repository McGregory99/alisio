import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WEATHER_PRESETS, MAX_FADE_DB, WIND_STOW_KMH, weatherEffects, rateFactor, isStowed,
  weatherAvailability, applyWeather, createWeatherState,
} from '../../src/core/weather.mjs';
import { assignAntennas } from '../../src/core/scheduler.mjs';
import { MASPALOMAS } from '../../src/data/stations/maspalomas.mjs';

const IDS = ['clear', 'calima', 'atlantic-rain', 'trade-wind'];

test('four presets: clear, calima dust haze, Atlantic cloud/rain, strong trade wind (R8.1)', () => {
  assert.deepEqual(WEATHER_PRESETS.map((p) => p.id), IDS);
  assert.ok(WEATHER_PRESETS.every((p) => p.label && p.illustrative === true));
});

test('clear has no fade and a neutral look (R8.2)', () => {
  const w = weatherEffects('clear');
  assert.equal(w.xBandFadeDb, 0);
  assert.equal(w.visual.cloudCover, 0);
  assert.equal(w.visual.rain, 0);
  assert.equal(w.visual.fogFarScale, 1);
  assert.equal(rateFactor('clear'), 1);
});

test('Atlantic cloud/rain applies a small X-band fade, above 0 and at most 3 dB (R8.2)', () => {
  const w = weatherEffects('atlantic-rain');
  assert.ok(w.xBandFadeDb > 0 && w.xBandFadeDb <= MAX_FADE_DB);
  assert.equal(MAX_FADE_DB, 3);
  assert.ok(w.visual.cloudCover > 0.5 && w.visual.rain > 0);
  assert.ok(rateFactor('atlantic-rain') < 1);
});

test('calima returns dust haze visuals and no rain fade', () => {
  const w = weatherEffects('calima');
  assert.ok(w.visual.dust > 0 && w.visual.fogFarScale < 1);
  assert.equal(w.visual.rain, 0);
  assert.ok(w.xBandFadeDb <= MAX_FADE_DB);
});

test('trade wind returns wind streak visuals and a wind speed above every antenna stow threshold', () => {
  const w = weatherEffects('trade-wind');
  assert.ok(w.visual.windStreaks > 0);
  assert.ok(w.windKmh > Math.max(...MASPALOMAS.antennas.map((a) => a.stowWindKmh)));
  assert.equal(weatherEffects('clear').visual.windStreaks, 0);
});

test('every preset keeps the fade within the cap', () => {
  for (const id of IDS) assert.ok(weatherEffects(id).xBandFadeDb >= 0 && weatherEffects(id).xBandFadeDb <= MAX_FADE_DB);
});

test('unknown preset is rejected', () => {
  assert.throws(() => weatherEffects('hurricane'), /unknown weather preset/i);
  assert.throws(() => rateFactor('hurricane'), /unknown weather preset/i);
  assert.throws(() => isStowed('hurricane', null, MASPALOMAS.antennas[0]), /unknown weather preset/i);
});

test('stow happens at or above the antenna threshold, never below (R8.2)', () => {
  const a = { stowWindKmh: 90 };
  assert.equal(isStowed('trade-wind', null, a), true);
  assert.equal(isStowed('clear', null, a), false);
  assert.equal(isStowed('atlantic-rain', null, a), false);
  assert.equal(isStowed('clear', 90, a), true);
  assert.equal(isStowed('clear', 89.9, a), false);
  assert.equal(isStowed('clear', 90, {}), WIND_STOW_KMH <= 90);
});

test('strong trade wind stows every Maspalomas antenna; the other presets stow none', () => {
  for (const a of MASPALOMAS.antennas) {
    assert.equal(isStowed('trade-wind', null, a), true, a.id);
    for (const id of ['clear', 'calima', 'atlantic-rain']) assert.equal(isStowed(id, null, a), false, `${a.id} ${id}`);
  }
});

const pass = { id: 'p1', norad: 40697, aos: 1_000_000, tca: 1_300_000, los: 1_600_000, maxElDeg: 60, aosAzDeg: 10, losAzDeg: 200 };

test('the availability predicate plugs into the scheduler: passes go unserved under strong trade wind', () => {
  const run = (id) => assignAntennas({ passes: [pass], station: MASPALOMAS, nowMs: 0, isAvailable: weatherAvailability(() => id) });
  assert.equal(run('clear')[0].status, 'assigned');
  assert.equal(run('trade-wind')[0].status, 'unassigned');
});

test('applyWeather drops lanes and assignments of stowed antennas and marks them (R8.2)', () => {
  const lane = { pass, phase: 'downlink' };
  const schedule = {
    assignments: [{ pass, antennaId: 'MSP-15', status: 'assigned' }],
    lanes: new Map([['MSP-15', lane]]),
    satellites: [{ norad: 40697, antennaId: 'MSP-15' }, { norad: 1, antennaId: null }],
    finished: [],
  };
  const wind = applyWeather(schedule, 'trade-wind', MASPALOMAS);
  assert.equal(wind.lanes.size, 0);
  assert.deepEqual([wind.assignments[0].status, wind.assignments[0].antennaId, wind.assignments[0].weather], ['unassigned', null, 'stowed']);
  assert.equal(wind.satellites[0].antennaId, null);
  assert.equal(schedule.lanes.size, 1, 'input is not mutated');
  assert.equal(schedule.assignments[0].status, 'assigned');
});

test('applyWeather marks served passes degraded with the fade under rain, and is a no-op when clear', () => {
  const schedule = { assignments: [{ pass, antennaId: 'MSP-15', status: 'assigned' }], lanes: new Map([['MSP-15', { pass }]]), satellites: [], finished: [] };
  const rain = applyWeather(schedule, 'atlantic-rain', MASPALOMAS);
  assert.equal(rain.assignments[0].status, 'assigned');
  assert.equal(rain.assignments[0].weather, 'degraded');
  assert.equal(rain.assignments[0].fadeDb, weatherEffects('atlantic-rain').xBandFadeDb);
  assert.equal(applyWeather(schedule, 'clear', MASPALOMAS), schedule);
});

test('weather state holds the selection, defaults to clear and notifies', () => {
  const s = createWeatherState();
  const seen = [];
  s.onChange((id) => seen.push(id));
  assert.equal(s.current(), 'clear');
  s.set('calima');
  s.set('calima');
  assert.equal(s.current(), 'calima');
  assert.deepEqual(seen, ['calima']);
  assert.throws(() => s.set('nope'), /unknown weather preset/i);
  assert.equal(s.current(), 'calima');
});
