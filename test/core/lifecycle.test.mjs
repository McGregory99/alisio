import { test } from 'node:test';
import assert from 'node:assert/strict';
import { phaseAt, PREPOSITION_MS, LOS_HOLD_MS } from '../../src/core/lifecycle.mjs';

const aos = Date.UTC(2026, 9, 15, 12, 0, 0), los = aos + 600_000;
const pass = { id: 'p', aos, tca: aos + 300_000, los };

test('no state before the pre-position window', () => {
  assert.equal(phaseAt(pass, aos - PREPOSITION_MS - 1), null);
});
test('pre-position starts 120 s before AOS', () => {
  assert.equal(PREPOSITION_MS, 120_000);
  assert.equal(phaseAt(pass, aos - PREPOSITION_MS), 'pre-position');
  assert.equal(phaseAt(pass, aos - 1), 'pre-position');
});
test('downlink between AOS and LOS', () => {
  assert.equal(phaseAt(pass, aos), 'downlink');
  assert.equal(phaseAt(pass, los - 1), 'downlink');
});
test('LOS at the loss instant, held briefly, then delivered', () => {
  assert.equal(phaseAt(pass, los), 'los');
  assert.equal(phaseAt(pass, los + LOS_HOLD_MS - 1), 'los');
  assert.equal(phaseAt(pass, los + LOS_HOLD_MS), 'delivered');
  assert.equal(phaseAt(pass, los + 86_400_000), 'delivered');
});
test('deterministic for the same pass and time', () => {
  assert.equal(phaseAt(pass, aos + 5), phaseAt({ ...pass }, aos + 5));
});
