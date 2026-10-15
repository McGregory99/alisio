import test from 'node:test';
import assert from 'node:assert/strict';
import { dimsForAntenna, egressPath } from '../../src/scene/station-assets-math.mjs';

test('15 m flagship is larger than the 5 m KSAT dish in every dimension', () => {
  const big = dimsForAntenna(15), small = dimsForAntenna(5);
  assert.ok(big.pedestalH > small.pedestalH && big.bowlR > small.bowlR && big.pivotH > small.pivotH);
  assert.equal(big.bowlR, 7.5);
});

test('egress path starts at the campus, heads away and ends beyond the campus radius', () => {
  const p = egressPath({ x: 0, z: 50 }, 0.9, 600, 12);
  assert.deepEqual(p[0], { x: 0, z: 50 });
  assert.ok(p.length > 10);
  const last = p.at(-1);
  assert.ok(Math.hypot(last.x, last.z - 50) > 500);
});
