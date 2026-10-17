import test from 'node:test';
import assert from 'node:assert/strict';
import { chipAlpha, placeChips, dishContent } from '../../src/scene/callouts-math.mjs';

test('chipAlpha: full near the camera, fading linearly to zero at the maximum distance', () => {
  assert.equal(chipAlpha(100, 1000), 1);
  assert.equal(chipAlpha(1000, 1000), 0);
  assert.equal(chipAlpha(5000, 1000), 0);
  const mid = chipAlpha(800, 1000);
  assert.ok(mid > 0 && mid < 1);
});

const chip = (id, x, y, priority, w = 100, h = 20) => ({ id, x, y, w, h, priority });

test('placeChips: overlapping chips keep only the higher priority one', () => {
  const kept = placeChips([chip('low', 100, 100, 10), chip('high', 110, 105, 90)], { maxChips: 10, width: 800, height: 600 });
  assert.deepEqual([...kept], ['high']);
});

test('placeChips: separate chips all stay', () => {
  const kept = placeChips([chip('a', 100, 100, 1), chip('b', 400, 300, 1)], { maxChips: 10, width: 800, height: 600 });
  assert.equal(kept.size, 2);
});

test('placeChips: too many chips are capped to the highest priorities', () => {
  const items = Array.from({ length: 8 }, (_, i) => chip(`c${i}`, 60 + i * 150 % 700, 40 + i * 60, i));
  const kept = placeChips(items, { maxChips: 3, width: 800, height: 600 });
  assert.equal(kept.size, 3);
  assert.ok(kept.has('c7') && kept.has('c6') && kept.has('c5'));
});

test('placeChips: chips fully outside the viewport are dropped', () => {
  const kept = placeChips([chip('off', -500, 50, 5), chip('on', 300, 300, 1)], { maxChips: 10, width: 800, height: 600 });
  assert.deepEqual([...kept], ['on']);
});

test('placeChips: ties on priority prefer the nearer anchor (lower dist)', () => {
  const kept = placeChips([{ ...chip('far', 100, 100, 5), dist: 900 }, { ...chip('near', 105, 100, 5), dist: 100 }], { maxChips: 10, width: 800, height: 600 });
  assert.deepEqual([...kept], ['near']);
});

const mission = { name: 'Sentinel-2B', downlink: { band: 'X', rateMbps: 560 } };

test('dishContent: stowed when there is no lane', () => {
  assert.deepEqual(dishContent('MSP-15', null), { title: 'MSP-15', sub: 'Stowed', tone: 'idle', priority: 40 });
});

test('dishContent: downlink shows satellite and rate', () => {
  const c = dishContent('MSP-15', { phase: 'downlink', mission });
  assert.equal(c.title, 'MSP-15');
  assert.equal(c.sub, 'Sentinel-2B · 560 Mbit/s');
  assert.equal(c.tone, 'live');
  assert.ok(c.priority > 40);
});

test('dishContent: pre-position and LOS phases are described honestly', () => {
  assert.equal(dishContent('MSP-15', { phase: 'pre-position', mission }).sub, 'Slewing to Sentinel-2B');
  assert.equal(dishContent('MSP-15', { phase: 'los', mission }).sub, 'LOS · Sentinel-2B');
});
