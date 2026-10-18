import test from 'node:test';
import assert from 'node:assert/strict';
import { SNAPSHOT } from '../../src/data/omm-snapshot.mjs';
import { toSatrec, periodMinutes, propagateAt } from '../../src/core/sgp4.mjs';
import { orbitLoopEci } from '../../src/core/orbit-loop.mjs';

const START = Date.parse('2026-10-18T09:00:00Z');
const sats = SNAPSHOT.records.map((r) => ({ r, sat: toSatrec(r) })).filter((s) => !s.sat.failed);
const at = (p, i) => [p[i * 3], p[i * 3 + 1], p[i * 3 + 2]];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

test('every snapshot record yields a loop of the requested size', () => {
  assert.ok(sats.length >= 8);
  for (const { sat } of sats) { const l = orbitLoopEci(sat, START, 150); assert.equal(l.points.length, 450); }
});

test('radius stays in the LEO range of the Sentinel fleet and the period is 90-120 min', () => {
  for (const { r, sat } of sats) {
    const { points, periodMin } = orbitLoopEci(sat, START, 150);
    assert.ok(periodMin > 90 && periodMin < 120, `${r.NORAD_CAT_ID} period ${periodMin}`);
    for (let i = 0; i < 150; i++) { const rad = Math.hypot(...at(points, i)); assert.ok(rad > 6600 && rad < 8000, `${r.NORAD_CAT_ID} radius ${rad}`); }
  }
});

test('the loop closes: one more period lands back on the first sample and the closing step is as long as any other', () => {
  for (const { sat } of sats) {
    const { points, periodMin } = orbitLoopEci(sat, START, 150);
    const pv = propagateAt(sat, new Date(START + periodMin * 60_000));
    assert.ok(dist(at(points, 0), [pv.position.x, pv.position.y, pv.position.z]) < 120, 'start and start + one period are close');
    const step = dist(at(points, 0), at(points, 1));
    assert.ok(dist(at(points, 149), at(points, 0)) < step * 1.25 && dist(at(points, 149), at(points, 0)) > step * 0.75);
  }
});

test('periodMinutes is null for a failed satellite and loops are null', () => {
  assert.equal(periodMinutes({ failed: true, satrec: null }), null);
  assert.equal(orbitLoopEci({ failed: true, satrec: null }, START), null);
});
