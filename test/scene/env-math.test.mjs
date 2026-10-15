import test from 'node:test';
import assert from 'node:assert/strict';
import { envFromSun } from '../../src/scene/env-math.mjs';

test('local night is dark with stars', () => {
  const e = envFromSun(-30);
  assert.ok(e.sunIntensity === 0);
  assert.equal(e.starOpacity, 1);
  assert.ok(e.ambient < 0.3);
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
