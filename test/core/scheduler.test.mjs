import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assignAntennas, canDownlink, BUSY_BEFORE_MS, BUSY_AFTER_MS } from '../../src/core/scheduler.mjs';
import { MASPALOMAS } from '../../src/data/stations/maspalomas.mjs';
import { fixtureStation } from '../fixtures/station-fixture.mjs';
import { missionByNorad } from '../../src/data/missions.mjs';

const T0 = Date.UTC(2026, 9, 15, 12, 0, 0);
const MIN = 60_000;
const S1C = 62261, S2B = 42063, S3A = 41335;
const pass = (norad, aosMin, durMin, maxEl = 30) => ({
  id: `${norad}-${aosMin}`, norad, aos: T0 + aosMin * MIN, tca: T0 + (aosMin + durMin / 2) * MIN, los: T0 + (aosMin + durMin) * MIN, maxElDeg: maxEl,
});
const ant = (id) => MASPALOMAS.antennas.find((a) => a.id === id);
const run = (passes, opts = {}) => assignAntennas({ passes, station: MASPALOMAS, nowMs: T0 - 60 * MIN, ...opts });
const of = (res, id) => res.find((r) => r.pass.id === id);

test('X-band payload passes go to the flagship first', () => {
  const r = run([pass(S1C, 10, 10)]);
  assert.equal(r[0].antennaId, 'MSP-15');
  assert.equal(r[0].status, 'assigned');
});

test('the KSAT 5 m is the X-band fallback when the flagship is busy', () => {
  const r = run([pass(S1C, 10, 10, 60), pass(S2B, 15, 10, 50)]);
  assert.equal(of(r, `${S1C}-10`).antennaId, 'MSP-15');
  assert.equal(of(r, `${S2B}-15`).antennaId, 'MSP-KSAT5');
});

test('an S-band-only antenna is never assigned a payload downlink', () => {
  assert.equal(canDownlink(ant('MSP-S9'), missionByNorad(S1C)), false);
  assert.equal(canDownlink(ant('MSP-15'), missionByNorad(S1C)), true);
  const r = run([pass(S1C, 10, 10), pass(S2B, 12, 10), pass(S3A, 14, 10)]);
  assert.ok(r.every((x) => x.antennaId !== 'MSP-S9'));
});

test('a third overlapping pass is unassigned when every capable antenna is busy', () => {
  const r = run([pass(S1C, 10, 10), pass(S2B, 12, 10), pass(S3A, 14, 10)]);
  assert.equal(of(r, `${S3A}-14`).status, 'unassigned');
  assert.equal(of(r, `${S3A}-14`).antennaId, null);
});

test('the busy window is [AOS - 120 s, LOS + 60 s]', () => {
  assert.equal(BUSY_BEFORE_MS, 120_000);
  assert.equal(BUSY_AFTER_MS, 60_000);
  // second pass AOS 90 s after first LOS: inside LOS + 60 s? no (90 > 60) but pre-position (AOS-120 s) overlaps -> blocked
  const blocked = run([pass(S1C, 10, 10), pass(S2B, 21.5, 5)], { station: { ...MASPALOMAS, antennas: [ant('MSP-15')] } });
  assert.equal(of(blocked, `${S2B}-21.5`).status, 'unassigned');
  // 4 min after LOS: free
  const free = run([pass(S1C, 10, 10), pass(S2B, 24, 5)], { station: { ...MASPALOMAS, antennas: [ant('MSP-15')] } });
  assert.equal(of(free, `${S2B}-24`).antennaId, 'MSP-15');
});

test('mission priority wins over AOS order, then maximum elevation', () => {
  const only = { ...MASPALOMAS, antennas: [ant('MSP-15')] };
  const r = run([pass(S2B, 10, 10, 80), pass(S1C, 12, 10, 20)], { station: only });
  assert.equal(of(r, `${S1C}-12`).status, 'assigned');
  assert.equal(of(r, `${S2B}-10`).status, 'unassigned');
  const tie = run([pass(42063, 10, 10, 30), pass(40697, 12, 10, 70)], { station: only }); // both S2
  assert.equal(of(tie, '40697-12').status, 'assigned');
});

test('started passes are locked to their previous assignment', () => {
  const only = { ...MASPALOMAS, antennas: [ant('MSP-15'), ant('MSP-KSAT5')] };
  const started = pass(S2B, -2, 10, 20); // AOS 2 min before "now"
  const r = assignAntennas({
    passes: [started, pass(S1C, 3, 10, 80)], station: only, nowMs: T0,
    previous: { [started.id]: 'MSP-15' },
  });
  assert.equal(of(r, started.id).antennaId, 'MSP-15');
  assert.equal(of(r, `${S1C}-3`).antennaId, 'MSP-KSAT5');
});

test('the injected availability predicate (wind stow) is respected', () => {
  const r = run([pass(S1C, 10, 10)], { isAvailable: (antenna) => antenna.id !== 'MSP-15' });
  assert.equal(r[0].antennaId, 'MSP-KSAT5');
  const none = run([pass(S1C, 10, 10)], { isAvailable: () => false });
  assert.equal(none[0].status, 'unassigned');
});

test('works for the fixture station without code changes', () => {
  const r = assignAntennas({ passes: [pass(S1C, 10, 10)], station: fixtureStation, nowMs: T0 - 60 * MIN });
  assert.equal(r[0].antennaId, 'FIX-13');
});

test('results are sorted by AOS', () => {
  const r = run([pass(S3A, 30, 10), pass(S1C, 10, 10), pass(S2B, 50, 10)]);
  assert.deepEqual(r.map((x) => x.pass.aos), [...r.map((x) => x.pass.aos)].sort((a, b) => a - b));
});
