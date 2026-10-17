import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortRows, nextSort, antennaTable, satelliteTable, passTable } from '../../src/ui/tables-model.mjs';
import { MASPALOMAS } from '../../src/data/stations/maspalomas.mjs';
import { MISSIONS } from '../../src/data/missions.mjs';
import { SNAPSHOT } from '../../src/data/omm-snapshot.mjs';

test('sortRows sorts numbers numerically, strings alphabetically, either direction', () => {
  const rows = [{ a: 10, s: 'b' }, { a: 2, s: 'c' }, { a: 33, s: 'a' }];
  assert.deepEqual(sortRows(rows, 'a', 'asc').map((r) => r.a), [2, 10, 33]);
  assert.deepEqual(sortRows(rows, 'a', 'desc').map((r) => r.a), [33, 10, 2]);
  assert.deepEqual(sortRows(rows, 's', 'asc').map((r) => r.s), ['a', 'b', 'c']);
});

test('sortRows keeps missing values last in both directions and does not mutate the input', () => {
  const rows = [{ a: null }, { a: 3 }, { a: 1 }];
  assert.deepEqual(sortRows(rows, 'a', 'asc').map((r) => r.a), [1, 3, null]);
  assert.deepEqual(sortRows(rows, 'a', 'desc').map((r) => r.a), [3, 1, null]);
  assert.deepEqual(rows.map((r) => r.a), [null, 3, 1]);
});

test('sortRows is stable for equal keys', () => {
  const rows = [{ k: 1, n: 'x' }, { k: 1, n: 'y' }, { k: 0, n: 'z' }];
  assert.deepEqual(sortRows(rows, 'k', 'asc').map((r) => r.n), ['z', 'x', 'y']);
});

test('nextSort toggles direction on the same column and starts ascending on a new one', () => {
  assert.deepEqual(nextSort({ key: 'a', dir: 'asc' }, 'a'), { key: 'a', dir: 'desc' });
  assert.deepEqual(nextSort({ key: 'a', dir: 'desc' }, 'a'), { key: 'a', dir: 'asc' });
  assert.deepEqual(nextSort({ key: 'a', dir: 'desc' }, 'b'), { key: 'b', dir: 'asc' });
});

test('antenna table shows band roles and provenance for every antenna (R7.5)', () => {
  const t = antennaTable(MASPALOMAS);
  assert.equal(t.rows.length, MASPALOMAS.antennas.length);
  const flagship = t.rows.find((r) => r.id === 'MSP-15');
  assert.equal(flagship.diameterM, 15);
  assert.equal(flagship.rx, 'S, X');
  assert.equal(flagship.tx, 'S');
  assert.match(flagship.roles, /payload-downlink/);
  assert.equal(flagship.provenance, 'verified');
  assert.ok(t.rows.every((r) => ['verified', 'illustrative'].includes(r.provenance)));
  assert.ok(t.columns.some((c) => c.key === 'provenance'));
});

test('satellite table has one row per mission with epoch age (R7.5)', () => {
  const now = new Date('2026-10-15T12:00:00Z');
  const t = satelliteTable({ missions: MISSIONS, records: SNAPSHOT.records, nowDate: now, states: new Map() });
  assert.equal(t.rows.length, 11);
  const s2b = t.rows.find((r) => r.norad === 42063);
  assert.equal(s2b.name, 'Sentinel-2B');
  assert.ok(s2b.epochAgeDays > 0 && s2b.epochAgeDays < 3, `age ${s2b.epochAgeDays}`);
  assert.ok(['fresh', 'aging', 'stale'].includes(s2b.epochState));
  assert.ok(t.rows.every((r) => ['verified', 'illustrative'].includes(r.provenance)));
});

test('a mission without an orbit record shows no epoch age', () => {
  const t = satelliteTable({ missions: MISSIONS, records: [], nowDate: new Date(), states: new Map() });
  assert.equal(t.rows[0].epochAgeDays, null);
});

test('pass table lists served and unserved passes with times and antenna', () => {
  const p = { id: 'a', norad: 42063, aos: Date.parse('2026-10-15T12:00:00Z'), tca: Date.parse('2026-10-15T12:05:00Z'), los: Date.parse('2026-10-15T12:10:00Z'), maxElDeg: 55.4 };
  const q = { ...p, id: 'b', aos: p.aos + 3_600_000, tca: p.tca + 3_600_000, los: p.los + 3_600_000 };
  const t = passTable({ assignments: [{ pass: p, antennaId: 'MSP-15', status: 'assigned' }, { pass: q, antennaId: null, status: 'unassigned' }], finished: [] }, p.aos - 1000);
  assert.equal(t.rows.length, 2);
  assert.equal(t.rows[0].aosUtc, '12:00:00');
  assert.equal(t.rows[0].durationS, 600);
  assert.equal(t.rows[0].antenna, 'MSP-15');
  assert.equal(t.rows[1].antenna, 'unserved');
  assert.equal(t.rows[0].maxElDeg, 55);
});

test('pass table carries the band, the illustrative rate and chip kinds for band and state columns', () => {
  const p = { id: 'a', norad: 42063, aos: Date.parse('2026-10-15T12:00:00Z'), tca: Date.parse('2026-10-15T12:05:00Z'), los: Date.parse('2026-10-15T12:10:00Z'), maxElDeg: 55.4 };
  const t = passTable({ assignments: [{ pass: p, antennaId: 'MSP-15', status: 'assigned' }], finished: [] }, p.aos - 1000);
  assert.equal(t.rows[0].band, 'X');
  assert.equal(t.rows[0].rateMbps, 560);
  assert.equal(t.columns.find((c) => c.key === 'band').chip, 'band');
  assert.equal(t.columns.find((c) => c.key === 'phase').chip, 'phase');
  assert.ok(t.columns.some((c) => c.key === 'los' && c.field === 'losUtc'));
  assert.equal(t.rows[0].losUtc, '12:10:00');
});
