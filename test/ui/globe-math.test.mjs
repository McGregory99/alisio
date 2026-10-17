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

// --- shading and footprint ---
import { sunSubpoint, nightAlpha, footprintRadiusDeg } from '../../src/ui/globe-math.mjs';

test('sun sub-point is near the equator at an equinox noon UTC on the prime meridian', () => {
  const s = sunSubpoint(new Date('2026-03-20T12:00:00Z'));
  assert.ok(Math.abs(s.latDeg) < 1, `lat ${s.latDeg}`);
  assert.ok(Math.abs(s.lonDeg) < 3, `lon ${s.lonDeg}`);
  const j = sunSubpoint(new Date('2026-06-21T12:00:00Z'));
  assert.ok(Math.abs(j.latDeg - 23.4) < 0.5);
});

test('night alpha is 0 at the sun point, 1 opposite, and about half on the terminator', () => {
  const sun = { latDeg: 0, lonDeg: 0 };
  assert.ok(nightAlpha(0, 0, sun) < 0.05);
  assert.ok(nightAlpha(0, 180, sun) > 0.95);
  assert.ok(Math.abs(nightAlpha(0, 90, sun) - 0.5) < 0.05);
});

test('footprint radius grows with altitude and shrinks with the elevation mask', () => {
  const a = footprintRadiusDeg(700, 5), b = footprintRadiusDeg(800, 5), c = footprintRadiusDeg(700, 15);
  assert.ok(a > 15 && a < 25, `${a}`);
  assert.ok(b > a);
  assert.ok(c < a);
});

import { unproject } from '../../src/ui/globe-math.mjs';

test('unproject inverts project on the visible disc and rejects points outside it', () => {
  const centre = { latDeg: 27.76, lonDeg: -15.63 };
  const p = project(40, -5, centre, 100);
  const q = unproject(p.x, p.y, centre, 100);
  assert.ok(Math.abs(q.latDeg - 40) < 1e-6 && Math.abs(q.lonDeg + 5) < 1e-6);
  assert.equal(unproject(120, 0, centre, 100), null);
  assert.deepEqual(unproject(0, 0, centre, 100), centre);
});

import { destination } from '../../src/ui/globe-math.mjs';

test('destination moves along a bearing: north raises latitude, east keeps it near, a full circle returns', () => {
  const a = destination({ latDeg: 10, lonDeg: 20 }, 0, 5);
  assert.ok(Math.abs(a.latDeg - 15) < 1e-9 && Math.abs(a.lonDeg - 20) < 1e-9);
  const e = destination({ latDeg: 0, lonDeg: 0 }, 90, 10);
  assert.ok(Math.abs(e.lonDeg - 10) < 1e-9 && Math.abs(e.latDeg) < 1e-9);
  const w = destination({ latDeg: 0, lonDeg: 175 }, 90, 10);
  assert.ok(Math.abs(w.lonDeg + 175) < 1e-9, 'wraps across the antimeridian');
});
