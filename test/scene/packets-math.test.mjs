import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pointOnPolyline, flowFractions } from '../../src/scene/packets-math.mjs';

const line = [{ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }, { x: 10, y: 0, z: 10 }];

test('a polyline parameter maps to its ends and to the arc-length midpoint', () => {
  assert.deepEqual(pointOnPolyline(line, 0), { x: 0, y: 0, z: 0 });
  assert.deepEqual(pointOnPolyline(line, 1), { x: 10, y: 0, z: 10 });
  assert.deepEqual(pointOnPolyline(line, 0.5), { x: 10, y: 0, z: 0 });
  assert.deepEqual(pointOnPolyline(line, 0.25), { x: 5, y: 0, z: 0 });
});

test('the parameter is clamped to the polyline', () => {
  assert.deepEqual(pointOnPolyline(line, -3), { x: 0, y: 0, z: 0 });
  assert.deepEqual(pointOnPolyline(line, 9), { x: 10, y: 0, z: 10 });
});

test('flow fractions are evenly spread, in [0,1), and advance with time', () => {
  const a = flowFractions(4, 0, 0.5), b = flowFractions(4, 0.5, 0.5);
  assert.deepEqual(a, [0, 0.25, 0.5, 0.75]);
  assert.ok(b.every((f) => f >= 0 && f < 1));
  assert.ok(Math.abs(b[0] - 0.25) < 1e-9);
  assert.equal(flowFractions(0, 1, 1).length, 0);
});
