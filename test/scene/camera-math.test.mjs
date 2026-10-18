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

import { framingPosition, smoothstep, lerp3, followDelta } from '../../src/scene/camera-math.mjs';

test('framing keeps the viewing direction and sets the distance to the target', () => {
  const p = framingPosition({ x: 0, y: 0, z: 0 }, { x: 30, y: 0, z: 40 }, 100);
  assert.ok(Math.abs(p.x - 60) < 1e-9 && Math.abs(p.z - 80) < 1e-9 && p.y === 0);
});

test('framing a camera sitting exactly on the target falls back to a diagonal view', () => {
  const p = framingPosition({ x: 5, y: 5, z: 5 }, { x: 5, y: 5, z: 5 }, 50);
  assert.ok(Math.abs(Math.hypot(p.x - 5, p.y - 5, p.z - 5) - 50) < 1e-9);
});

test('smoothstep eases between 0 and 1 and clamps', () => {
  assert.equal(smoothstep(-1), 0);
  assert.equal(smoothstep(0), 0);
  assert.equal(smoothstep(0.5), 0.5);
  assert.equal(smoothstep(1), 1);
  assert.equal(smoothstep(7), 1);
});

test('lerp3 interpolates each axis', () => {
  assert.deepEqual(lerp3({ x: 0, y: 10, z: -4 }, { x: 10, y: 20, z: 4 }, 0.5), { x: 5, y: 15, z: 0 });
});

test('follow delta is the movement of the tracked point since the last frame', () => {
  assert.deepEqual(followDelta({ x: 1, y: 2, z: 3 }, { x: 4, y: 2, z: 0 }), { x: 3, y: 0, z: -3 });
  assert.deepEqual(followDelta(null, { x: 4, y: 2, z: 0 }), { x: 0, y: 0, z: 0 });
});

import { flyDuration, easeInOut } from '../../src/scene/camera-math.mjs';

test('flyDuration: short hops are quick, long flights take longer, always within 0.9..2.6 s', () => {
  assert.ok(flyDuration(20) < flyDuration(1500));
  assert.ok(flyDuration(0) >= 0.9 && flyDuration(1e6) <= 2.6);
});

test('easeInOut: 0 at 0, 1 at 1, symmetric midpoint, monotonic', () => {
  assert.equal(easeInOut(0), 0);
  assert.equal(easeInOut(1), 1);
  assert.ok(Math.abs(easeInOut(0.5) - 0.5) < 1e-9);
  assert.ok(easeInOut(0.3) < easeInOut(0.4));
});

test('interaction scheme: free camera pans, locked camera rotates around the object', async () => {
  const { interactionScheme } = await import('../../src/scene/camera-math.mjs');
  const lim = { freeMin: 25, lockedMin: 8 };
  assert.deepEqual(interactionScheme(false, lim), { left: 'pan', oneTouch: 'pan', pan: true, minDistance: 25 });
  assert.deepEqual(interactionScheme(true, lim), { left: 'rotate', oneTouch: 'rotate', pan: false, minDistance: 8 });
});
