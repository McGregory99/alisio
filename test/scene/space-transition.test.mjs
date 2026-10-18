import test from 'node:test';
import assert from 'node:assert/strict';
import { initialTransition, stepTransition, fadeAlpha, showsSpace, inputLive, pushZoom, FADE_S, ZOOM_THRESHOLD } from '../../src/scene/space-transition.mjs';

const MAX = 1400, MIN = 7964;
const push = (acc, o) => pushZoom(acc, { localMax: MAX, spaceMin: MIN, nowMs: 0, ...o });
const fresh = () => ({ amount: 0, lastMs: 0 });

test('the local scene stays local until the user keeps zooming out at the maximum distance', () => {
  let s = initialTransition();
  assert.equal(stepTransition(s, { dt: 1 }).phase, 'local');
  assert.equal(push(fresh(), { phase: 'local', deltaY: 120, distance: 900 }).acc.amount, 0, 'not at the limit: no push');
  assert.equal(push(fresh(), { phase: 'local', deltaY: -120, distance: 1400 }).acc.amount, 0, 'zooming in never counts');
  let acc = fresh(), r;
  r = push(acc, { phase: 'local', deltaY: 120, distance: 1400, nowMs: 10 }); assert.equal(r.enterSpace, false); acc = r.acc;
  r = push(acc, { phase: 'local', deltaY: 120, distance: 1400, nowMs: 100 }); assert.equal(r.enterSpace, false); acc = r.acc;
  r = push(acc, { phase: 'local', deltaY: 120, distance: 1400, nowMs: 200 });
  assert.equal(r.enterSpace, true);
  s = stepTransition(s, { enterSpace: r.enterSpace });
  assert.equal(s.phase, 'to-space');
});

test('a pause forgets the push, and reversing the wheel cancels it', () => {
  let r = push(fresh(), { phase: 'local', deltaY: 200, distance: 1400, nowMs: 10 });
  r = push(r.acc, { phase: 'local', deltaY: 200, distance: 1400, nowMs: 5000 });
  assert.equal(r.enterSpace, false, 'idle gap');
  r = push(r.acc, { phase: 'local', deltaY: -50, distance: 1400, nowMs: 5100 });
  assert.equal(r.acc.amount, 0);
  assert.ok(ZOOM_THRESHOLD > 120, 'one notch is not enough');
});

test('to-space fades out, switches scene at the midpoint behind a dark overlay, then fades in and settles in space', () => {
  let s = stepTransition(initialTransition(), { enterSpace: true });
  assert.equal(showsSpace(s), false);
  assert.equal(fadeAlpha(s), 0);
  s = stepTransition(s, { dt: FADE_S / 2 });
  assert.equal(s.phase, 'to-space'); assert.equal(showsSpace(s), true); assert.ok(fadeAlpha(s) > 0.99);
  assert.equal(inputLive(s), false);
  s = stepTransition(s, { dt: FADE_S / 2 });
  assert.equal(s.phase, 'space'); assert.equal(fadeAlpha(s), 0); assert.equal(inputLive(s), true);
});

test('in space only zooming in at the minimum distance (or a back request) returns, via to-local', () => {
  const space = { phase: 'space', t: 0 };
  assert.equal(push(fresh(), { phase: 'space', deltaY: -400, distance: 20000 }).leaveSpace, false, 'far from the minimum');
  assert.equal(push(fresh(), { phase: 'space', deltaY: 400, distance: MIN }).leaveSpace, false, 'zooming out does not leave');
  const r = push(fresh(), { phase: 'space', deltaY: -400, distance: MIN });
  assert.equal(r.leaveSpace, true);
  assert.equal(stepTransition(space, { leaveSpace: true }).phase, 'to-local');
  assert.equal(stepTransition(space, { dt: 5 }).phase, 'space');
  let s = stepTransition(space, { leaveSpace: true });
  assert.equal(showsSpace(s), true);
  s = stepTransition(s, { dt: FADE_S / 2 });
  assert.equal(showsSpace(s), false);
  s = stepTransition(s, { dt: FADE_S / 2 });
  assert.equal(s.phase, 'local');
});

test('input during a fade is ignored: no re-entry while transitioning', () => {
  const mid = { phase: 'to-space', t: 0.1 };
  assert.equal(stepTransition(mid, { enterSpace: true, leaveSpace: true }).phase, 'to-space');
  assert.equal(push(fresh(), { phase: 'to-space', deltaY: 900, distance: 1400 }).enterSpace, false);
});
