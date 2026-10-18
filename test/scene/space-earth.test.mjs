import test from 'node:test';
import assert from 'node:assert/strict';
import { paintEarth } from '../../src/scene/space-earth.mjs';
import { COASTLINES } from '../../src/data/coastlines.mjs';

function recorder() {
  const calls = [];
  const g = new Proxy({}, { get: (_, name) => (name === 'createLinearGradient' ? () => ({ addColorStop() {} }) : (...a) => { calls.push([name, ...a]); }), set: () => true });
  return { g, calls };
}

test('paintEarth fills the ocean over the whole canvas and draws every coastline ring with canvas coordinates inside the texture', () => {
  const { g, calls } = recorder();
  paintEarth(g, COASTLINES, 2048, 1024);
  assert.deepEqual(calls.find((c) => c[0] === 'fillRect'), ['fillRect', 0, 0, 2048, 1024]);
  assert.equal(calls.filter((c) => c[0] === 'moveTo').length, COASTLINES.length);
  for (const [name, x, y] of calls) if (name === 'moveTo' || name === 'lineTo') assert.ok(x >= 0 && x <= 2048 && y >= 0 && y <= 1024);
  assert.ok(calls.some((c) => c[0] === 'fill') && calls.some((c) => c[0] === 'stroke'));
});

test('west is left: a point at lon -100 is drawn left of one at lon +20', () => {
  const { g, calls } = recorder();
  paintEarth(g, [[[-100, 40], [-99, 41], [-98, 40]], [[20, 0], [21, 1], [22, 0]]], 360, 180);
  const [a, b] = calls.filter((c) => c[0] === 'moveTo');
  assert.ok(a[1] < b[1]);
  assert.equal(a[1], 80); assert.equal(a[2], 50);
});
