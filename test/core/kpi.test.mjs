import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kpis } from '../../src/core/kpi.mjs';

const MIN = 60_000, H = 3_600_000;
const S1C = 62261, S2B = 42063;
const P = (norad, aosMin, durMin = 10) => ({ id: `${norad}-${aosMin}`, norad, aos: aosMin * MIN, tca: (aosMin + durMin / 2) * MIN, los: (aosMin + durMin) * MIN });
const NOW = 12 * H; // 12:00 UTC on day 0 of the epoch (UTC midnight = 0)

test('empty list is safe', () => {
  const k = kpis([], NOW);
  assert.equal(k.passesToday, 0);
  assert.equal(k.nextAosMs, null);
  assert.equal(k.countdownMs, null);
  assert.equal(k.activeCount, 0);
  assert.equal(k.volumeGb, 0);
  assert.deepEqual(k.timeliness, { finished: 0, onTime: 0, atRisk: 0, late: 0 });
});

test('countdown equals the earliest future AOS minus now', () => {
  const k = kpis([P(S2B, 12 * 60 + 40), P(S1C, 12 * 60 + 25), P(S2B, 8 * 60)], NOW);
  assert.equal(k.nextAosMs, (12 * 60 + 25) * MIN);
  assert.equal(k.countdownMs, 25 * MIN);
});

test('a pass starting exactly now is active, not the next AOS', () => {
  const k = kpis([P(S1C, 12 * 60), P(S2B, 12 * 60 + 30)], NOW);
  assert.equal(k.activeCount, 1);
  assert.equal(k.countdownMs, 30 * MIN);
});

test('active count at the boundaries: AOS inclusive, LOS exclusive', () => {
  const p = P(S1C, 12 * 60, 10);
  assert.equal(kpis([p], p.aos - 1).activeCount, 0);
  assert.equal(kpis([p], p.aos).activeCount, 1);
  assert.equal(kpis([p], p.los - 1).activeCount, 1);
  assert.equal(kpis([p], p.los).activeCount, 0);
});

test('passes today counts AOS within the UTC day of now', () => {
  const k = kpis([P(S1C, -5), P(S1C, 0), P(S2B, 23 * 60 + 59), P(S2B, 24 * 60)], NOW);
  assert.equal(k.passesToday, 2);
});

test('volume sums mission rate times duration for passes finished in the last 24 h (illustrative)', () => {
  // S1C: 520 Mbps over 600 s = 312000 Mb = 39 GB
  const k = kpis([P(S1C, 12 * 60 - 30, 10), P(S1C, 12 * 60 - 25 * 60, 10), P(S1C, 12 * 60 + 5, 10)], NOW);
  assert.equal(Math.round(k.volumeGb), 39);
});

test('timeliness summary counts finished passes by NRT status', () => {
  const k = kpis([P(S1C, 12 * 60 - 30), P(S2B, 12 * 60 - 90), P(S1C, 12 * 60 + 5)], NOW);
  assert.equal(k.timeliness.finished, 2);
  assert.equal(k.timeliness.onTime, 2);
  assert.equal(k.timeliness.atRisk + k.timeliness.late, 0);
});

test('an injected completion time makes a slow product late', () => {
  const p = P(S1C, 12 * 60 - 30, 10);
  const k = kpis([p], NOW, { nrtDoneOf: () => p.los + 4 * H });
  assert.equal(k.timeliness.late, 1);
  assert.equal(k.timeliness.onTime, 0);
});

test('without completion data, a product past its goal but before the NRT deadline is at risk', () => {
  const p = P(S1C, 12 * 60 - 2 * 60 - 10, 10); // LOS 2 h ago
  const k = kpis([p], NOW, { nrtDoneOf: () => null });
  assert.equal(k.timeliness.atRisk, 1);
});
