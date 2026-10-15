import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deadlines, productTimeline, timelinessStatus } from '../../src/core/timeliness.mjs';
import { missionByNorad } from '../../src/data/missions.mjs';

const H = 3_600_000;
const LOS = Date.UTC(2026, 9, 15, 12, 0, 0);
const s1 = missionByNorad(62261), s2 = missionByNorad(42063);
const pass = { id: 'p', los: LOS };

test('S1 LOS at T gives NRT T+3 h, goal T+1 h, archive T+24 h', () => {
  const d = deadlines(pass, s1);
  assert.equal(d.nrt, LOS + 3 * H);
  assert.equal(d.goal, LOS + 1 * H);
  assert.equal(d.archive, LOS + 24 * H);
  assert.equal(d.illustrative, false);
});

test('non-S1 targets are flagged illustrative', () => {
  assert.equal(deadlines(pass, s2).illustrative, true);
});

test('the product timeline lists downlink, goal, NRT and archive in order', () => {
  const t = productTimeline(pass, s1);
  assert.deepEqual(t.map((x) => x.id), ['downlink-complete', 'nrt-goal', 'nrt', 'archive']);
  assert.deepEqual(t.map((x) => x.at), [LOS, LOS + H, LOS + 3 * H, LOS + 24 * H]);
  assert.ok(t.every((x) => x.label));
});

test('status boundaries without completion: pending, on-time, at-risk, late', () => {
  const st = (dt) => timelinessStatus({ pass, mission: s1, nowMs: LOS + dt }).status;
  assert.equal(st(-1), 'pending');
  assert.equal(st(0), 'on-time');
  assert.equal(st(H), 'on-time');
  assert.equal(st(H + 1), 'at-risk');
  assert.equal(st(3 * H), 'at-risk');
  assert.equal(st(3 * H + 1), 'late');
  assert.equal(st(3.5 * H), 'late');
});

test('a completed NRT product is judged by its completion time', () => {
  assert.equal(timelinessStatus({ pass, mission: s1, nowMs: LOS + 5 * H, nrtDoneMs: LOS + 2 * H }).status, 'on-time');
  assert.equal(timelinessStatus({ pass, mission: s1, nowMs: LOS + 5 * H, nrtDoneMs: LOS + 3.2 * H }).status, 'late');
});

test('the status carries the illustrative flag for non-S1 missions', () => {
  assert.equal(timelinessStatus({ pass, mission: s2, nowMs: LOS }).illustrative, true);
  assert.equal(timelinessStatus({ pass, mission: s1, nowMs: LOS }).illustrative, false);
});
