import test from 'node:test';
import assert from 'node:assert/strict';
import { constrainCamera } from '../../src/scene/camera-math.mjs';

const flat = () => 10;
const opts = { heightAt: flat, clearance: 5, maxDistance: 600 };

test('a camera below terrain is lifted to terrain plus clearance', () => {
  const p = constrainCamera({ x: 0, y: 2, z: 50 }, { x: 0, y: 10, z: 0 }, opts);
  assert.equal(p.y, 15);
});

test('a camera above the clearance is untouched', () => {
  const p = constrainCamera({ x: 1, y: 100, z: 50 }, { x: 0, y: 10, z: 0 }, opts);
  assert.deepEqual(p, { x: 1, y: 100, z: 50 });
});

test('distance beyond the maximum is pulled back along the view ray', () => {
  const p = constrainCamera({ x: 0, y: 10, z: 1200 }, { x: 0, y: 10, z: 0 }, { ...opts, heightAt: () => -100, maxDistance: 600 });
  assert.ok(Math.abs(Math.hypot(p.x, p.y - 10, p.z) - 600) < 1e-6);
});
