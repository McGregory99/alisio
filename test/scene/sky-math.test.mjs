import { test } from 'node:test';
import assert from 'node:assert/strict';
import { skyPoint, SKY_RADIUS } from '../../src/scene/sky-math.mjs';

const RAD = Math.PI / 180;
// Scene frame: x east, y up, z south-positive (-z north). Recover az/el from a scene offset.
const azEl = (c, p) => {
  const e = p.x - c.x, u = p.y - c.y, n = -(p.z - c.z);
  return { az: (Math.atan2(e, n) / RAD + 360) % 360, el: Math.atan2(u, Math.hypot(e, n)) / RAD };
};

test('a sky point seen from its centre has the requested az/el (within 1 deg)', () => {
  const centre = { x: 12, y: 40, z: -7 };
  for (const [az, el] of [[0, 10], [90, 45], [200, 80], [315, 5], [45, 89]]) {
    const r = azEl(centre, skyPoint(centre, az, el));
    assert.ok(Math.abs(r.el - el) < 1, `el ${r.el} vs ${el}`);
    if (el < 89) assert.ok(Math.abs(((r.az - az + 540) % 360) - 180) < 1, `az ${r.az} vs ${az}`);
  }
});

test('the sky sphere has radius 320 around its centre', () => {
  assert.equal(SKY_RADIUS, 320);
  const c = { x: 0, y: 0, z: 0 };
  const p = skyPoint(c, 123, 33);
  assert.ok(Math.abs(Math.hypot(p.x, p.y, p.z) - 320) < 1e-9);
});

test('north is -z, east is +x, zenith is +y', () => {
  const c = { x: 0, y: 0, z: 0 };
  assert.ok(skyPoint(c, 0, 0).z < -319);
  assert.ok(skyPoint(c, 90, 0).x > 319);
  assert.ok(skyPoint(c, 0, 90).y > 319);
});
