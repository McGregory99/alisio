import test from 'node:test';
import assert from 'node:assert/strict';
import { sunDirectionEci } from '../../src/core/sun-eci.mjs';
import { gmstRad } from '../../src/core/sgp4.mjs';
import { sunSubpoint } from '../../src/ui/globe-math.mjs';

const len = (v) => Math.hypot(v.x, v.y, v.z);

test('sun direction is a unit vector', () => {
  for (const d of ['2026-01-05T00:00:00Z', '2026-06-21T12:00:00Z', '2026-10-18T06:30:00Z']) assert.ok(Math.abs(len(sunDirectionEci(new Date(d))) - 1) < 1e-9);
});

test('at the March equinox the sun is on the equator toward the vernal equinox; at the June solstice it is 23.4 deg north', () => {
  const eq = sunDirectionEci(new Date('2026-03-20T14:46:00Z'));
  assert.ok(eq.x > 0.999 && Math.abs(eq.z) < 0.01, JSON.stringify(eq));
  const sol = sunDirectionEci(new Date('2026-06-21T08:24:00Z'));
  assert.ok(Math.abs(Math.asin(sol.z) * 180 / Math.PI - 23.44) < 0.1);
  assert.ok(sunDirectionEci(new Date('2026-12-21T20:50:00Z')).z < -0.39);
});

test('rotated by GMST it lands on the sub-solar point of the mini globe model', () => {
  for (const d of ['2026-10-18T12:00:00Z', '2026-02-03T03:17:00Z', '2026-07-30T21:45:00Z']) {
    const date = new Date(d), s = sunDirectionEci(date), g = gmstRad(date);
    const lat = Math.asin(s.z) * 180 / Math.PI;
    let lon = (Math.atan2(s.y, s.x) - g) * 180 / Math.PI;
    lon = ((lon % 360) + 540) % 360 - 180;
    const ref = sunSubpoint(date);
    assert.ok(Math.abs(lat - ref.latDeg) < 0.05, `${d} lat ${lat} vs ${ref.latDeg}`);
    assert.ok(Math.abs(((lon - ref.lonDeg + 540) % 360) - 180) < 0.7, `${d} lon ${lon} vs ${ref.lonDeg}`);
  }
});
