import test from 'node:test';
import assert from 'node:assert/strict';
import { envFromSun } from '../../src/scene/env-math.mjs';

test('local night is dark with stars', () => {
  const e = envFromSun(-30);
  assert.ok(e.sunIntensity === 0);
  assert.equal(e.starOpacity, 1);
  assert.ok(e.ambient < 0.5);
});

test('local noon is lit with no stars', () => {
  const e = envFromSun(70);
  assert.ok(e.sunIntensity > 1);
  assert.equal(e.starOpacity, 0);
  assert.ok(e.ambient > 0.4);
});

test('twilight blends monotonically between night and day', () => {
  const a = envFromSun(-10).sunIntensity, b = envFromSun(0).sunIntensity, c = envFromSun(10).sunIntensity;
  assert.ok(a <= b && b <= c);
  assert.ok(envFromSun(-9).starOpacity > 0 && envFromSun(-9).starOpacity < 1);
});

test('sky colours are hex strings', () => {
  for (const el of [-40, -6, 5, 50]) assert.match(envFromSun(el).skyHex, /^#[0-9a-f]{6}$/);
});

test('night keeps a legibility floor: ambient and moonlight never reach zero (Amendment 7)', () => {
  for (const el of [-90, -45, -30, -18]) {
    const e = envFromSun(el);
    assert.ok(e.ambient >= 0.35, `ambient ${e.ambient} at ${el}`);
    assert.ok(e.moonIntensity >= 0.3, `moon ${e.moonIntensity} at ${el}`);
  }
  assert.ok(envFromSun(-30).ambient < envFromSun(70).ambient);
});

test('station lights are on at night, off at noon, and ramp with the sun', () => {
  assert.equal(envFromSun(-30).stationLights, 1);
  assert.equal(envFromSun(70).stationLights, 0);
  const a = envFromSun(-2).stationLights, b = envFromSun(3).stationLights, c = envFromSun(8).stationLights;
  assert.ok(a >= b && b >= c);
  assert.ok(b > 0 && b < 1);
});

test('night sky colour stays distinguishable from black', () => {
  assert.notEqual(envFromSun(-40).skyHex, '#000000');
  assert.ok(parseInt(envFromSun(-40).skyHex.slice(5, 7), 16) >= 0x20); // blue channel floor
});

// R8.1: weather presets modulate the sun-driven environment (illustrative).
import { weatherEnv, BASE_FOG } from '../../src/scene/env-math.mjs';
import { weatherEffects } from '../../src/core/weather.mjs';

const lum = (hex) => [1, 3, 5].reduce((s, i) => s + parseInt(hex.slice(i, i + 2), 16), 0);

test('clear weather leaves the sun-driven environment untouched', () => {
  const e = envFromSun(60);
  const w = weatherEnv(e, weatherEffects('clear').visual);
  assert.deepEqual([w.skyHex, w.fogHex, w.sunIntensity, w.ambient, w.starOpacity], [e.skyHex, e.fogHex, e.sunIntensity, e.ambient, e.starOpacity]);
  assert.deepEqual([w.fogNear, w.fogFar], [BASE_FOG.near, BASE_FOG.far]);
});

test('each non-clear preset visibly changes the daytime environment', () => {
  const e = envFromSun(60);
  for (const id of ['calima', 'atlantic-rain', 'trade-wind']) {
    const w = weatherEnv(e, weatherEffects(id).visual);
    const changed = w.skyHex !== e.skyHex || w.sunIntensity !== e.sunIntensity || w.fogFar !== BASE_FOG.far;
    assert.ok(changed, id);
  }
});

test('calima thickens the air and dims the sun; rain greys and dims it most', () => {
  const e = envFromSun(60);
  const calima = weatherEnv(e, weatherEffects('calima').visual);
  const rain = weatherEnv(e, weatherEffects('atlantic-rain').visual);
  assert.ok(calima.fogFar < BASE_FOG.far * 0.5 && calima.fogNear < BASE_FOG.near);
  assert.ok(calima.sunIntensity < e.sunIntensity);
  assert.ok(rain.sunIntensity < calima.sunIntensity);
});

test('weather never brightens the night sky and clouds hide the stars', () => {
  const night = envFromSun(-30);
  const rain = weatherEnv(night, weatherEffects('atlantic-rain').visual);
  assert.ok(lum(rain.skyHex) <= lum(night.skyHex) + 24);
  assert.ok(rain.starOpacity < night.starOpacity);
  assert.equal(rain.sunIntensity, 0);
});

import { gradeFromSun, sunGlowStrength, domeColors } from '../../src/scene/env-math.mjs';

test('gradeFromSun: warm at golden hour, cool at night, nearly neutral at noon; alpha stays subtle', () => {
  const golden = gradeFromSun(3), night = gradeFromSun(-30), noon = gradeFromSun(60);
  const [gr, , gb] = [1, 3, 5].map((i) => parseInt(golden.tintHex.slice(i, i + 2), 16));
  const [nr, , nb] = [1, 3, 5].map((i) => parseInt(night.tintHex.slice(i, i + 2), 16));
  assert.ok(gr > gb, 'golden tint is warm');
  assert.ok(nb > nr, 'night tint is cool');
  assert.ok(noon.tintAlpha < golden.tintAlpha);
  for (const g of [golden, night, noon]) assert.ok(g.tintAlpha >= 0 && g.tintAlpha <= 0.22 && g.vignette >= 0 && g.vignette <= 0.5);
});

test('sunGlowStrength: none well below the horizon, strongest low in the sky', () => {
  assert.equal(sunGlowStrength(-30), 0);
  assert.ok(sunGlowStrength(4) > sunGlowStrength(60));
  assert.ok(sunGlowStrength(60) > 0);
});

test('domeColors: horizon haze is lighter than the zenith by day and never brighter than fog at night', () => {
  const day = domeColors('#8fb8d8', '#98bfdc');
  const lum = (h) => parseInt(h.slice(1, 3), 16) + parseInt(h.slice(3, 5), 16) + parseInt(h.slice(5, 7), 16);
  assert.ok(lum(day.bottom) >= lum(day.top));
  assert.match(day.top, /^#[0-9a-f]{6}$/);
  assert.equal(domeColors('#101a38', '#141e3c', 0).bottom, '#141e3c');
});
