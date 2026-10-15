import { test } from 'node:test';
import assert from 'node:assert/strict';
import { project, visibleRuns } from '../../src/ui/globe-math.mjs';

const C = { latDeg: 27.76, lonDeg: -15.63 };
const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

test('the centre point projects to the origin and is visible', () => {
  const p = project(C.latDeg, C.lonDeg, C, 100);
  near(p.x, 0); near(p.y, 0); assert.equal(p.visible, true);
});

test('north of the centre is up (negative y), east is right', () => {
  assert.ok(project(C.latDeg + 10, C.lonDeg, C, 100).y < 0);
  assert.ok(project(C.latDeg, C.lonDeg + 10, C, 100).x > 0);
});

test('90 degrees along the equator-parallel great circle lands on the rim, farther is hidden', () => {
  const rim = project(0, 0, { latDeg: 0, lonDeg: 0 }, 100);
  assert.equal(rim.visible, true);
  const e = project(0, 90, { latDeg: 0, lonDeg: 0 }, 100);
  near(e.x, 100, 1e-6); assert.equal(e.visible, true);
  assert.equal(project(0, 120, { latDeg: 0, lonDeg: 0 }, 100).visible, false);
  assert.equal(project(-C.latDeg, C.lonDeg + 180, C, 100).visible, false); // antipode
});

test('visible runs split a track where it passes behind the limb', () => {
  const O = { latDeg: 0, lonDeg: 0 };
  const pts = [0, 40, 80, 130, 170, 130, 80, 40].map((lon) => ({ latDeg: 0, lonDeg: lon }));
  const runs = visibleRuns(pts, O, 100);
  assert.equal(runs.length, 2);
  assert.equal(runs[0].length, 3);
  assert.equal(runs[1].length, 2);
});
