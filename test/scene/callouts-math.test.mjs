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

import { chipShown, closeDist, activeAnchorIds, clampChip, hudRects } from '../../src/scene/callouts-math.mjs';

const base = { id: 'x', selectedId: null, hoveredId: null, activeIds: new Set(), view: 'campus', dist: 900, maxDist: 1500, processing: false, note: false };

test('chipShown: far chips with nothing special stay hidden', () => {
  assert.equal(chipShown(base), false);
});

test('chipShown: the selected, the hovered and the active-pass anchors always show', () => {
  assert.equal(chipShown({ ...base, id: 'a', selectedId: 'a' }), true);
  assert.equal(chipShown({ ...base, id: 'a', hoveredId: 'a' }), true);
  assert.equal(chipShown({ ...base, id: 'a', activeIds: new Set(['a']) }), true);
});

test('chipShown: other chips appear only when the camera is close', () => {
  assert.equal(chipShown({ ...base, dist: closeDist(1500) - 1 }), true);
  assert.equal(chipShown({ ...base, dist: closeDist(1500) + 1 }), false);
  assert.ok(closeDist(520) < 520 && closeDist(5000) <= 240);
});

test('chipShown: pipeline and egress chips need the processing view or a selection, even when close', () => {
  const p = { ...base, processing: true, dist: 10 };
  assert.equal(chipShown(p), false);
  assert.equal(chipShown({ ...p, view: 'processing' }), true);
  assert.equal(chipShown({ ...p, id: 'p', selectedId: 'p' }), true);
});

test('chipShown: technical notes show only in the view they explain, never by distance', () => {
  const n = { ...base, note: true, dist: 10 };
  assert.equal(chipShown({ ...n, id: 'coast-note' }), false);
  assert.equal(chipShown({ ...n, id: 'coast-note', view: 'coast' }), true);
  assert.equal(chipShown({ ...n, id: 'coast-note', view: 'orbit' }), false);
  assert.equal(chipShown({ ...n, id: 'sky-note', view: 'orbit' }), true);
  assert.equal(chipShown({ ...n, id: 'other-note', view: 'campus', hoveredId: 'other-note' }), true);
});

test('activeAnchorIds: the antennas of running lanes and their satellites', () => {
  const lanes = new Map([['MSP-15', { pass: { norad: 42063 } }], ['MSP-9', { pass: { norad: 40697 } }]]);
  assert.deepEqual([...activeAnchorIds(lanes)].sort(), ['MSP-15', 'MSP-9', 'sat-40697', 'sat-42063']);
  assert.equal(activeAnchorIds(undefined).size, 0);
});

test('clampChip: a chip is pulled fully inside the viewport with a margin', () => {
  const c = clampChip({ x: -20, y: 5, w: 100, h: 20 }, { width: 800, height: 600, margin: 6 });
  assert.equal(c.x, 6 + 50); assert.equal(c.y, 6 + 10);
  const d = clampChip({ x: 790, y: 599, w: 100, h: 20 }, { width: 800, height: 600, margin: 6 });
  assert.equal(d.x, 800 - 6 - 50); assert.equal(d.y, 600 - 6 - 10);
  const ok = clampChip({ x: 300, y: 300, w: 100, h: 20 }, { width: 800, height: 600 });
  assert.deepEqual([ok.x, ok.y], [300, 300]);
});

test('placeChips: chips overlapping a blocked HUD rectangle are dropped, not drawn under it', () => {
  const blocked = [{ left: 0, top: 0, right: 200, bottom: 100 }];
  const kept = placeChips([chip('under', 100, 50, 9), chip('free', 400, 300, 1)], { maxChips: 10, width: 800, height: 600, blocked });
  assert.deepEqual([...kept], ['free']);
});

test('hudRects: only visible, non-empty rectangles are returned', () => {
  const els = [
    { getBoundingClientRect: () => ({ left: 0, top: 0, right: 10, bottom: 10, width: 10, height: 10 }) },
    { getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }) },
  ];
  assert.equal(hudRects(els).length, 1);
});
