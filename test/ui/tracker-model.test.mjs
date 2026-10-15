import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trackerRows } from '../../src/ui/tracker-model.mjs';

const MIN = 60_000, H = 3_600_000;
const S1C = 62261, S2B = 42063;
const P = (norad, aosMin, durMin = 10) => ({ id: `${norad}-${aosMin}`, norad, aos: aosMin * MIN, tca: (aosMin + durMin / 2) * MIN, los: (aosMin + durMin) * MIN, maxElDeg: 40 });
const A = (pass, antennaId = 'MSP-15') => ({ pass, antennaId, status: antennaId ? 'assigned' : 'unassigned' });
const NOW = 12 * H;
const fin = (pass) => ({ pass, mission: null, antennaId: 'MSP-15' });

test('rows are ordered by AOS and carry the lifecycle state from phaseAt', () => {
  const sched = { assignments: [A(P(S2B, 12 * 60 + 50)), A(P(S1C, 12 * 60 - 5)), A(P(S2B, 12 * 60 + 1))], finished: [] };
  const rows = trackerRows(sched, NOW);
  assert.deepEqual(rows.map((r) => r.phase), ['downlink', 'pre-position', 'scheduled']);
  assert.equal(rows[0].name, 'Sentinel-1C');
  assert.equal(rows[0].aosUtc, '11:55');
});

test('unserved passes are listed and flagged', () => {
  const rows = trackerRows({ assignments: [A(P(S2B, 12 * 60 + 30), null)], finished: [] }, NOW);
  assert.equal(rows[0].antennaId, null);
  assert.equal(rows[0].served, false);
});

test('finished passes appear with delivered state and a timeliness status', () => {
  const rows = trackerRows({ assignments: [], finished: [fin(P(S1C, 12 * 60 - 30))] }, NOW);
  assert.equal(rows[0].phase, 'delivered');
  assert.equal(rows[0].timeliness.status, 'on-time');
});

test('non-S1 missions carry the illustrative marking, S1 does not (R5.6)', () => {
  const rows = trackerRows({ assignments: [A(P(S1C, 12 * 60 + 5)), A(P(S2B, 12 * 60 + 20))], finished: [] }, NOW);
  assert.equal(rows.find((r) => r.norad === S1C).timeliness.illustrative, false);
  assert.equal(rows.find((r) => r.norad === S2B).timeliness.illustrative, true);
});

test('a pass in flight before the NRT goal is on time; before LOS it is pending', () => {
  const rows = trackerRows({ assignments: [A(P(S1C, 12 * 60 + 5))], finished: [fin(P(S1C, 12 * 60 - 20))] }, NOW);
  assert.equal(rows.find((r) => r.phase === 'scheduled' || r.phase === 'pre-position').timeliness.status, 'pending');
  assert.equal(rows.find((r) => r.phase === 'delivered').timeliness.status, 'on-time');
});

test('limit caps upcoming rows; at most 3 recent finished are kept, newest last before upcoming', () => {
  const assignments = Array.from({ length: 12 }, (_, i) => A(P(S2B, 12 * 60 + 5 + i * 20)));
  const finished = Array.from({ length: 5 }, (_, i) => fin(P(S1C, 12 * 60 - 200 + i * 30)));
  const rows = trackerRows({ assignments, finished }, NOW, { limit: 6 });
  assert.equal(rows.filter((r) => r.phase === 'delivered').length, 3);
  assert.equal(rows.filter((r) => r.phase !== 'delivered').length, 6);
  assert.deepEqual(rows.map((r) => r.aos), [...rows.map((r) => r.aos)].sort((a, b) => a - b));
});

test('empty schedule gives no rows', () => {
  assert.deepEqual(trackerRows({ assignments: [], finished: [] }, NOW), []);
});
