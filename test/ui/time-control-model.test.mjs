import { test } from 'node:test';
import assert from 'node:assert/strict';
import { timeButtons, formatUtc, nextPassTarget } from '../../src/ui/time-control-model.mjs';
import { createSimClock } from '../../src/core/clock.mjs';

const pressed = (clock) => timeButtons(clock).filter((b) => b.pressed).map((b) => b.id);

test('a fresh clock shows Live pressed', () => {
  assert.deepEqual(pressed(createSimClock()), ['live']);
});

test('warp rates press their own button and release Live', () => {
  const c = createSimClock();
  c.setRate(60);
  assert.deepEqual(pressed(c), ['rate-60']);
  c.setRate(600);
  assert.deepEqual(pressed(c), ['rate-600']);
});

test('pause is a separate pressed state and keeps the chosen rate', () => {
  const c = createSimClock();
  c.setRate(10); c.pause();
  assert.deepEqual(pressed(c).sort(), ['pause', 'rate-10']);
  c.resume();
  assert.deepEqual(pressed(c), ['rate-10']);
});

test('buttons are Live, 10x, 60x, 600x and Pause in that order', () => {
  assert.deepEqual(timeButtons(createSimClock()).map((b) => b.label), ['Live', '10x', '60x', '600x', 'Pause']);
});

test('UTC time is formatted to the second', () => {
  assert.equal(formatUtc(Date.UTC(2026, 9, 15, 21, 46, 45, 366)), '2026-10-15 21:46:45 UTC');
});

test('next pass targets the earliest pre-position time of served passes only', () => {
  const a = [
    { status: 'unassigned', pass: { aos: 1_000_000 } },
    { status: 'assigned', pass: { aos: 5_000_000 } },
    { status: 'assigned', pass: { aos: 3_000_000 } },
  ];
  assert.equal(nextPassTarget(a, 0), 3_000_000 - 120_000);
  assert.equal(nextPassTarget([], 0), null);
});
