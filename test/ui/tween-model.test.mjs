import { test } from 'node:test';
import assert from 'node:assert/strict';
import { approach } from '../../src/ui/tween-model.mjs';

test('approach moves toward the target without overshooting', () => {
  const a = approach(0, 100, 0.1);
  assert.ok(a > 0 && a < 100);
  const b = approach(a, 100, 0.1);
  assert.ok(b > a && b < 100);
});

test('approach is monotonic downwards too and snaps once close enough', () => {
  assert.ok(approach(100, 0, 0.1) < 100);
  assert.equal(approach(99.9999, 100, 0.016, { epsilon: 0.01 }), 100);
  assert.equal(approach(5, 5, 1), 5);
});

test('a long frame reaches the target and a zero frame does not move', () => {
  assert.equal(approach(0, 10, 100, { epsilon: 0.01 }), 10);
  assert.equal(approach(3, 10, 0), 3);
});
