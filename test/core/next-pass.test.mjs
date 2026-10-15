import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextPassTime } from '../../src/core/clock.mjs';

const P = (aos) => ({ aos, los: aos + 600_000 });
const passes = [P(5_000_000), P(1_000_000), P(9_000_000)]; // unsorted on purpose

test('returns the earliest pre-position time (AOS - 120 s) after now', () => {
  assert.equal(nextPassTime(passes, 0), 1_000_000 - 120_000);
  assert.equal(nextPassTime(passes, 1_000_000 - 120_001), 1_000_000 - 120_000);
});

test('a pass whose pre-position time already passed is skipped, even if still running', () => {
  assert.equal(nextPassTime(passes, 1_000_000 - 120_000), 5_000_000 - 120_000);
  assert.equal(nextPassTime(passes, 1_200_000), 5_000_000 - 120_000);
});

test('returns null when there is no later pass or the list is empty', () => {
  assert.equal(nextPassTime(passes, 9_000_000), null);
  assert.equal(nextPassTime([], 0), null);
});
