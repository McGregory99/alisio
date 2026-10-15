import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildSnapshot, fetchRecords, renderModule, GROUP_URL } from '../../tools/update-snapshot.mjs';
import { SNAPSHOT } from '../../src/data/omm-snapshot.mjs';

const extras = [
  { ...SNAPSHOT.records[0], OBJECT_NAME: 'SENTINEL-1A', NORAD_CAT_ID: 39634 },
  { ...SNAPSHOT.records[0], OBJECT_NAME: 'SENTINEL-1B', NORAD_CAT_ID: 41456 },
];

test('buildSnapshot filters 13 objects down to the 11 catalog missions', () => {
  const snap = buildSnapshot([...SNAPSHOT.records, ...extras], '2026-10-15T00:00:00Z');
  assert.equal(snap.records.length, 11);
  assert.equal(snap.fetchedAt, '2026-10-15T00:00:00Z');
});

test('buildSnapshot refuses records that fail satrec validation', () => {
  const bad = { ...SNAPSHOT.records[0], ECCENTRICITY: 5, MEAN_MOTION: -1 };
  assert.throws(() => buildSnapshot([bad, ...SNAPSHOT.records.slice(1)], 'x'), /NORAD/);
});

test('live mode issues exactly one grouped request through the injected fetch', async () => {
  const calls = [];
  const fetchFn = async (url) => (calls.push(url), { ok: true, status: 200, json: async () => [...SNAPSHOT.records, ...extras] });
  const records = await fetchRecords(fetchFn);
  assert.deepEqual(calls, [GROUP_URL]);
  assert.match(GROUP_URL, /gp\.php\?NAME=SENTINEL&FORMAT=JSON$/);
  assert.equal(records.length, 13);
});

test('non-200 responses throw and are not retried', async () => {
  let n = 0;
  await assert.rejects(fetchRecords(async () => (n++, { ok: false, status: 403 })), /403/);
  assert.equal(n, 1);
});

test('rendered module is marked generated and round-trips', () => {
  const text = renderModule(SNAPSHOT);
  assert.match(text, /^\/\/ GENERATED/);
  assert.match(text, /fetchedAt/);
  assert.equal(readFileSync(new URL('../../src/data/omm-snapshot.mjs', import.meta.url), 'utf8'), text);
});
