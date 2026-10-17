import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLoop, pointAt, stepTraffic, ringGap } from '../../src/scene/traffic-math.mjs';
import { ringRoad } from '../../src/scene/campus-math.mjs';

const loop = buildLoop(ringRoad(100, 64));

test('buildLoop: closed length is close to the circumference', () => {
  assert.ok(Math.abs(loop.length - 2 * Math.PI * 100) < 2);
});

test('pointAt: wraps around the loop and returns a heading tangent to the path', () => {
  const p0 = pointAt(loop, 0), pw = pointAt(loop, loop.length);
  assert.ok(Math.hypot(p0.x - pw.x, p0.z - pw.z) < 1e-6);
  const p = pointAt(loop, 50), q = pointAt(loop, 50.5);
  assert.ok(Math.abs(Math.atan2(q.x - p.x, q.z - p.z) - p.heading) < 0.05);
});

const run = (cars, seconds, opts) => {
  let c = cars;
  const minGaps = [];
  for (let t = 0; t < seconds; t += 0.1) {
    c = stepTraffic(c, loop, 0.1, opts);
    minGaps.push(Math.min(...c.map((a, i) => ringGap(loop, a.s, c[(i + 1) % c.length].s))));
  }
  return { cars: c, minGap: Math.min(...minGaps) };
};

test('cars keep moving forward along the loop', () => {
  const { cars } = run([{ id: 'a', s: 0, v: 0, vmax: 6, wait: 0 }], 20);
  assert.ok(cars[0].s > 50);
});

test('a faster car yields to a slower one and never closes inside the minimum gap', () => {
  const cars = [{ id: 'slow', s: 40, v: 3, vmax: 3, wait: 0 }, { id: 'fast', s: 0, v: 9, vmax: 9, wait: 0 }];
  const { minGap } = run(cars, 240, { headway: 18, minGap: 8 });
  assert.ok(minGap >= 7.5, `minGap ${minGap}`);
});

test('a car dwells at a stop and the car behind waits instead of overtaking', () => {
  const stops = [{ s: 120, dwell: 8 }];
  const cars = [{ id: 'a', s: 100, v: 6, vmax: 6, wait: 0 }, { id: 'b', s: 70, v: 6, vmax: 6, wait: 0 }];
  let c = cars, stopped = false;
  for (let t = 0; t < 12; t += 0.1) {
    c = stepTraffic(c, loop, 0.1, { stops, headway: 18, minGap: 8 });
    if (c[0].wait > 0) stopped = true;
  }
  assert.ok(stopped, 'car a stopped');
  assert.ok(ringGap(loop, c[1].s, c[0].s) >= 7.5);
});

test('ringGap: distance ahead around the loop, always positive and below the length', () => {
  assert.ok(Math.abs(ringGap(loop, 10, 30) - 20) < 1e-9);
  assert.ok(Math.abs(ringGap(loop, 30, 10) - (loop.length - 20)) < 1e-9);
});

import { angleToS } from '../../src/scene/traffic-math.mjs';

test('angleToS: the angle of a campus point maps to the matching distance along a ring loop', () => {
  assert.ok(Math.abs(angleToS(loop, 0)) < 1e-9);
  assert.ok(Math.abs(angleToS(loop, Math.PI) - loop.length / 2) < 1e-9);
  assert.ok(Math.abs(angleToS(loop, -Math.PI / 2) - loop.length * 0.75) < 1e-9);
});
