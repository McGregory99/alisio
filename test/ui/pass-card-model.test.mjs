import { test } from 'node:test';
import assert from 'node:assert/strict';
import { passCardModel } from '../../src/ui/pass-card-model.mjs';

const MIN = 60_000;
const card = (aos, los) => ({ id: 'p1', norad: 42063, name: 'Sentinel-2B', provenance: 'verified', antennaId: 'MSP-15', band: 'X', rateMbps: 560, maxElDeg: 62, aos, los, live: false, pass: { aos, los, norad: 42063, id: 'p1', maxElDeg: 62 } });

test('no pass: an honest empty card', () => {
  const m = passCardModel(null, 0);
  assert.equal(m.empty, true);
  assert.match(m.text, /no .*pass/i);
});

test('a pass in the future is the NEXT pass with an AOS countdown and no live flag', () => {
  const now = 1_000_000_000_000;
  const m = passCardModel(card(now + 10 * MIN, now + 20 * MIN), now);
  assert.equal(m.empty, false);
  assert.equal(m.kind, 'Next pass');
  assert.equal(m.live, false);
  assert.equal(m.countdown, 'AOS in 10:00');
  assert.equal(m.name, 'Sentinel-2B');
  assert.equal(m.antenna, 'MSP-15');
  assert.equal(m.band, 'X');
  assert.equal(m.rate, '560 Mb/s');
  assert.equal(m.segments.length, 5);
  assert.equal(m.segments[0].state, 'active');
});

test('during downlink it is the ACTIVE pass with a LOS countdown and progress through the stages', () => {
  const now = 1_000_000_000_000;
  const m = passCardModel(card(now - 2 * MIN, now + 8 * MIN), now);
  assert.equal(m.kind, 'Active pass');
  assert.equal(m.live, true);
  assert.equal(m.countdown, 'LOS in 08:00');
  assert.equal(m.stage, 'Downlink');
  assert.deepEqual(m.segments.map((s) => s.state), ['done', 'done', 'active', 'todo', 'todo']);
  assert.ok(m.fill > 0.4 && m.fill < 0.7);
});

test('the pre-position stage counts down to AOS and is still the active pass', () => {
  const now = 1_000_000_000_000;
  const m = passCardModel(card(now + 60_000, now + 11 * MIN), now);
  assert.equal(m.kind, 'Active pass');
  assert.equal(m.stage, 'Pointing');
  assert.equal(m.countdown, 'AOS in 01:00');
});

test('the aria label states the satellite, antenna and the countdown', () => {
  const now = 1_000_000_000_000;
  const m = passCardModel(card(now + 10 * MIN, now + 20 * MIN), now);
  assert.match(m.label, /Next pass/);
  assert.match(m.label, /Sentinel-2B/);
  assert.match(m.label, /MSP-15/);
  assert.match(m.label, /AOS in 10:00/);
});
