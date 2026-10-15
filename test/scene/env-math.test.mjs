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
