import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groundTrack } from '../../src/core/groundtrack.mjs';
import { toSatrec, ecfAt } from '../../src/core/sgp4.mjs';
import { subpoint } from '../../src/core/geo.mjs';
import { SNAPSHOT } from '../../src/data/omm-snapshot.mjs';

const omm = SNAPSHOT.records.find((r) => r.NORAD_CAT_ID === 42063);
const sat = toSatrec(omm);
const T0 = Date.parse('2026-10-15T12:00:00Z');

test('samples every step from start to end inclusive', () => {
  const pts = groundTrack(sat, T0, T0 + 10 * 60_000, 60_000);
  assert.equal(pts.length, 11);
  assert.equal(pts[0].t, T0);
  assert.equal(pts[10].t, T0 + 10 * 60_000);
});

test('each point equals the sub-satellite point of the propagated position', () => {
  const [p] = groundTrack(sat, T0, T0, 60_000);
  const sp = subpoint(ecfAt(sat, new Date(T0)));
  assert.equal(p.latDeg, sp.latDeg);
  assert.equal(p.lonDeg, sp.lonDeg);
});

test('latitude stays within the orbit inclination band over a full orbit', () => {
  const pts = groundTrack(sat, T0, T0 + 101 * 60_000, 60_000);
  const maxLat = Math.max(...pts.map((p) => Math.abs(p.latDeg)));
  assert.ok(maxLat > 70 && maxLat <= 82, `max lat ${maxLat}`);
});

test('a failed satellite yields no track', () => {
  assert.deepEqual(groundTrack(toSatrec({ NORAD_CAT_ID: 1 }), T0, T0 + 60_000, 60_000), []);
});
