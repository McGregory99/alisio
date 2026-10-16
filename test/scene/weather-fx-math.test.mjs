import test from 'node:test';
import assert from 'node:assert/strict';
import { wrap, cloudLayout, WIND_DIR } from '../../src/scene/weather-fx-math.mjs';

test('wrap keeps a coordinate inside [min, min + size) in both directions', () => {
  assert.equal(wrap(5, 0, 10), 5);
  assert.equal(wrap(12, 0, 10), 2);
  assert.equal(wrap(-3, 0, 10), 7);
  assert.equal(wrap(-95, -100, 200), -95);
  assert.equal(wrap(110, -100, 200), -90);
});

test('cloud layout is deterministic, sits above the campus and outside the dish area', () => {
  const a = cloudLayout(16), b = cloudLayout(16);
  assert.deepEqual(a, b);
  assert.equal(a.length, 16);
  for (const c of a) {
    assert.ok(c.y >= 150 && c.y <= 260);
    assert.ok(Math.hypot(c.x, c.z) >= 250);
    assert.ok(c.sx > 0 && c.sy > 0 && c.sz > 0);
  }
});

test('trade wind blows toward the south-west with a unit horizontal direction', () => {
  assert.ok(WIND_DIR.x < 0 && WIND_DIR.z > 0 && WIND_DIR.y === 0);
  assert.ok(Math.abs(Math.hypot(WIND_DIR.x, WIND_DIR.z) - 1) < 1e-9);
});
