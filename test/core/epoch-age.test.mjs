import test from 'node:test';
import assert from 'node:assert/strict';
import { epochAgeDays, epochState, newestEpochAge } from '../../src/core/orbit-source.mjs';

const NOW = new Date('2026-10-15T12:00:00Z');

test('OMM epochs without a zone suffix are read as UTC', () => {
  assert.equal(epochAgeDays('2026-10-14T12:00:00.000000', NOW), 1);
});

test('8 days old gives age > 7 and the warning flag', () => {
  const s = epochState('2026-10-07T12:00:00', NOW);
  assert.ok(s.ageDays > 7);
  assert.equal(s.state, 'stale');
  assert.equal(s.warning, true);
});

test('state boundaries: fresh <= 3, aging <= 7, stale > 7', () => {
  const at = (d) => epochState(new Date(NOW - d * 86_400_000).toISOString(), NOW);
  assert.equal(at(3).state, 'fresh');
  assert.equal(at(3.01).state, 'aging');
  assert.equal(at(7).state, 'aging');
  assert.equal(at(7).warning, false);
  assert.equal(at(7.01).state, 'stale');
});

test('newestEpochAge uses the most recent record', () => {
  const records = [{ EPOCH: '2026-10-01T00:00:00' }, { EPOCH: '2026-10-14T12:00:00' }];
  assert.equal(newestEpochAge(records, NOW), 1);
});
