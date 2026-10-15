import { test } from 'node:test';
import assert from 'node:assert/strict';
import { polarPoint, trackPath } from '../../src/ui/skyplot-math.mjs';

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

test('zenith maps to the centre', () => {
  const p = polarPoint(123, 90, 100);
  near(p.x, 0); near(p.y, 0);
});

test('horizon maps to the rim: north up, east right, south down, west left', () => {
  const n = polarPoint(0, 0, 100), e = polarPoint(90, 0, 100), s = polarPoint(180, 0, 100), w = polarPoint(270, 0, 100);
  near(n.x, 0); near(n.y, -100);
  near(e.x, 100); near(e.y, 0);
  near(s.x, 0); near(s.y, 100);
  near(w.x, -100); near(w.y, 0);
});

test('elevation scales the radius linearly', () => {
  const p = polarPoint(90, 45, 100);
  near(p.x, 50);
});

test('point can be inverted back to the look angles (consistency with the tracker)', () => {
  const p = polarPoint(217, 33, 80);
  const az = (Math.atan2(p.x, -p.y) * 180 / Math.PI + 360) % 360;
  const el = 90 - (Math.hypot(p.x, p.y) / 80) * 90;
  near(az, 217, 1e-6); near(el, 33, 1e-6);
});

test('track path keeps only samples at or above the horizon', () => {
  const pts = trackPath([{ azDeg: 0, elDeg: -2 }, { azDeg: 90, elDeg: 10 }, { azDeg: 180, elDeg: 0 }], 100);
  assert.equal(pts.length, 2);
});
