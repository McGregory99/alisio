import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimClock } from '../../src/core/clock.mjs';

function setup(simStart = Date.UTC(2026, 9, 15, 12)) {
  let real = 1_000_000;
  const clock = createSimClock({ realNow: () => real, simStart });
  return { clock, tick: (ms) => (real += ms), simStart };
}

test('live by default: sim time follows real time at rate 1', () => {
  const { clock, tick, simStart } = setup();
  tick(5000);
  assert.equal(clock.now(), simStart + 5000);
  assert.equal(clock.rate(), 1);
});

test('at 60x one real second advances 60 sim seconds', () => {
  const { clock, tick, simStart } = setup();
  clock.setRate(60);
  tick(1000);
  assert.equal(clock.now(), simStart + 60_000);
});

test('changing rate keeps sim time continuous', () => {
  const { clock, tick, simStart } = setup();
  tick(1000);
  clock.setRate(600);
  assert.equal(clock.now(), simStart + 1000);
  tick(1000);
  assert.equal(clock.now(), simStart + 1000 + 600_000);
});

test('only rates 1, 10, 60 and 600 are accepted', () => {
  const { clock } = setup();
  assert.throws(() => clock.setRate(7));
});

test('pause freezes sim time and resume continues from there', () => {
  const { clock, tick, simStart } = setup();
  tick(1000);
  clock.pause();
  tick(10_000);
  assert.equal(clock.now(), simStart + 1000);
  assert.equal(clock.isPaused(), true);
  clock.resume();
  tick(1000);
  assert.equal(clock.now(), simStart + 2000);
});

test('seek jumps sim time (next pass) and keeps the rate', () => {
  const { clock, tick } = setup();
  clock.setRate(60);
  clock.seek(Date.UTC(2026, 9, 16));
  tick(1000);
  assert.equal(clock.now(), Date.UTC(2026, 9, 16) + 60_000);
  assert.equal(clock.isLive(), false);
});

test('returning to live resets the anchor to real time at rate 1', () => {
  const real0 = 5_000_000;
  let real = real0;
  const clock = createSimClock({ realNow: () => real });
  assert.equal(clock.now(), real0);
  clock.setRate(600);
  real += 1000;
  clock.pause();
  clock.goLive();
  real += 2500;
  assert.equal(clock.now(), real);
  assert.equal(clock.rate(), 1);
  assert.equal(clock.isPaused(), false);
  assert.equal(clock.isLive(), true);
});
