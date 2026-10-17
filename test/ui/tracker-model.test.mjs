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

// --- pass stepper and current pass card ---
import { passStepper, currentPassCard } from '../../src/ui/tracker-model.mjs';

test('stepper has five honest stages with timestamps and marks the active one', () => {
  const pass = P(S1C, 12 * 60 + 10, 10); // AOS 12:10, LOS 12:20
  const at = (min) => passStepper(pass, min * MIN);
  assert.deepEqual(at(12 * 60).steps.map((s) => s.id), ['scheduled', 'pre-position', 'downlink', 'los', 'delivered']);
  assert.equal(at(12 * 60).activeIndex, 0);
  assert.equal(at(12 * 60 + 8).activeIndex, 1); // 2 min before AOS
  assert.equal(at(12 * 60 + 15).activeIndex, 2);
  assert.equal(at(12 * 60 + 20).activeIndex, 3);
  assert.equal(at(12 * 60 + 22).activeIndex, 4);
  assert.deepEqual(at(12 * 60).steps.map((s) => s.done), [false, false, false, false, false]);
  assert.deepEqual(at(12 * 60 + 15).steps.map((s) => s.done), [true, true, false, false, false]);
  const s = at(12 * 60);
  assert.equal(s.steps[1].timeUtc, '12:08:00');
  assert.equal(s.steps[2].timeUtc, '12:10:00');
  assert.equal(s.steps[3].timeUtc, '12:20:00');
  assert.equal(s.steps[4].timeUtc, '12:21:00');
  assert.equal(s.steps[0].timeUtc, null);
});

test('stepper reports the LOS countdown during the downlink and progress through it', () => {
  const pass = P(S1C, 12 * 60 + 10, 10);
  const s = passStepper(pass, (12 * 60 + 15) * MIN);
  assert.equal(s.losInMs, 5 * MIN);
  assert.equal(s.progress, 0.5);
  assert.equal(passStepper(pass, 12 * 60 * MIN).losInMs, null);
  assert.equal(passStepper(pass, 12 * 60 * MIN).progress, 0);
  assert.equal(passStepper(pass, (12 * 60 + 40) * MIN).progress, 1);
});

test('current pass card prefers the pass in flight, then the next served one, and carries the facts', () => {
  const sched = { assignments: [A(P(S2B, 12 * 60 + 50)), A(P(S1C, 12 * 60 - 5), 'MSP-KSAT5')], finished: [] };
  const card = currentPassCard(sched, NOW);
  assert.equal(card.name, 'Sentinel-1C');
  assert.equal(card.antennaId, 'MSP-KSAT5');
  assert.equal(card.band, 'X');
  assert.equal(card.rateMbps, 520);
  assert.equal(card.maxElDeg, 40);
  assert.equal(card.live, true);
  assert.equal(card.provenance, 'verified');
  const later = currentPassCard({ assignments: [A(P(S2B, 12 * 60 + 50))], finished: [] }, NOW);
  assert.equal(later.name, 'Sentinel-2B');
  assert.equal(later.live, false);
  assert.equal(currentPassCard({ assignments: [A(P(S2B, 12 * 60 + 50), null)], finished: [] }, NOW), null);
});
