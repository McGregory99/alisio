import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bucketCounts, sparkPath, rangeSeries, normalise } from '../../src/ui/spark-model.mjs';

const H = 3_600_000;

test('bucketCounts counts timestamps per equal bucket and ignores the ones outside the window', () => {
  const c = bucketCounts([0, 1, H + 5, 5 * H, 99 * H, -3], 0, 4 * H, 4);
  assert.deepEqual(c, [2, 1, 0, 0]);
});

test('bucketCounts rejects an empty window', () => {
  assert.deepEqual(bucketCounts([1, 2], 10, 10, 3), [0, 0, 0]);
});

test('rangeSeries samples a function at evenly spaced instants ending at the end instant', () => {
  const s = rangeSeries((t) => t / H, 0, 4 * H, 5);
  assert.deepEqual(s, [0, 1, 2, 3, 4]);
});

test('normalise maps a series to 0..1 and a flat series to the middle', () => {
  assert.deepEqual(normalise([2, 4, 6]), [0, 0.5, 1]);
  assert.deepEqual(normalise([3, 3]), [0.5, 0.5]);
  assert.deepEqual(normalise([]), []);
});

test('sparkPath builds a polyline fitted into the box, high values at the top', () => {
  const p = sparkPath([0, 10], 100, 20, 2);
  assert.equal(p, 'M2.00 18.00 L98.00 2.00');
  assert.equal(sparkPath([5], 100, 20, 2), '');
  assert.equal(sparkPath([], 100, 20, 2), '');
});
