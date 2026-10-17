import test from 'node:test';
import assert from 'node:assert/strict';
import { terrainHeight, SEA_LEVEL, COAST_Z, CAMPUS_HEIGHT, CAMPUS_RADIUS } from '../../src/scene/terrain-math.mjs';

test('terrain is deterministic', () => {
  assert.equal(terrainHeight(120, -80), terrainHeight(120, -80));
});

test('the campus platform is flat at the station height', () => {
  for (const [x, z] of [[0, 0], [20, -15], [-25, 30]]) assert.ok(Math.abs(terrainHeight(x, z) - CAMPUS_HEIGHT) < 0.01);
  assert.ok(CAMPUS_RADIUS > 30);
});

test('the station hill stands above its surroundings (Montana Blanca)', () => {
  assert.ok(terrainHeight(0, 0) > terrainHeight(260, 0) + 5);
});

test('the sea lies south of the compressed coast: below sea level beyond COAST_Z, land well north of it', () => {
  assert.ok(terrainHeight(0, COAST_Z + 120) < SEA_LEVEL);
  assert.ok(terrainHeight(0, COAST_Z - 150) > SEA_LEVEL);
});

test('ravines: a ridged channel makes some heights lower than the plateau mean nearby', () => {
  const hs = [];
  for (let x = -400; x <= 400; x += 20) hs.push(terrainHeight(x, -200));
  assert.ok(Math.max(...hs) - Math.min(...hs) > 6);
});

import { groundColor, scatterPoints, foamAlpha, seaDepthTint } from '../../src/scene/terrain-math.mjs';

test('mountain backdrop: a high ridge line rises far north of the campus', () => {
  const peaks = [];
  for (let x = -600; x <= 600; x += 40) peaks.push(terrainHeight(x, -1000));
  assert.ok(Math.max(...peaks) > 120);
  assert.ok(terrainHeight(0, -1000) > terrainHeight(0, -200) + 40 || Math.max(...peaks) > terrainHeight(0, -200) + 80);
});

test('the flat campus platform now covers the whole fenced campus (radius at least 100 m)', () => {
  for (const [x, z] of [[95, 0], [0, -95], [-70, 70]]) assert.ok(Math.abs(terrainHeight(x, z) - CAMPUS_HEIGHT) < 0.01);
});

const lum = (hex) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)); return 0.3 * r + 0.59 * g + 0.11 * b; };

test('groundColor: steep rock is darker than gentle ochre soil; both are valid hex colours', () => {
  const soil = groundColor({ h: 30, ny: 0.98, n: 0.4 }), rock = groundColor({ h: 30, ny: 0.5, n: 0.4 });
  assert.match(soil, /^#[0-9a-f]{6}$/); assert.match(rock, /^#[0-9a-f]{6}$/);
  assert.ok(lum(rock) < lum(soil) - 20);
});

test('groundColor: the shore is pale sand and high ground is darker than the lowlands', () => {
  const sand = groundColor({ h: 0.4, ny: 0.99, n: 0.5 });
  assert.ok(lum(sand) > lum(groundColor({ h: 30, ny: 0.99, n: 0.5 })) - 5);
  assert.ok(lum(groundColor({ h: 260, ny: 0.95, n: 0.5 })) < lum(groundColor({ h: 40, ny: 0.95, n: 0.5 })));
});

test('scatterPoints: deterministic, on land, outside the exclusion circle and inside the bounds', () => {
  const o = { seed: 7, count: 200, bounds: { x0: -600, x1: 600, z0: -500, z1: 400 }, heightAt: terrainHeight, minLand: 2, exclude: { x: 0, z: 0, r: 130 } };
  const a = scatterPoints(o), b = scatterPoints(o);
  assert.deepEqual(a, b);
  assert.ok(a.length > 100);
  for (const p of a) {
    assert.ok(p.x >= -600 && p.x <= 600 && p.z >= -500 && p.z <= 400);
    assert.ok(Math.hypot(p.x, p.z) >= 130);
    assert.ok(p.y >= 2);
    assert.ok(p.s > 0 && p.rot >= 0);
  }
});

test('scatterPoints: a different seed gives a different layout', () => {
  const o = { count: 50, bounds: { x0: -300, x1: 300, z0: -300, z1: 300 }, heightAt: terrainHeight, minLand: 2, exclude: { x: 0, z: 0, r: 130 } };
  assert.notDeepEqual(scatterPoints({ ...o, seed: 1 }), scatterPoints({ ...o, seed: 2 }));
});

test('foamAlpha: strongest at the waterline, zero on dry land and in deep water', () => {
  assert.ok(foamAlpha(0) > 0.5);
  assert.equal(foamAlpha(6), 0);
  assert.equal(foamAlpha(-12), 0);
});

test('seaDepthTint: shallow water is lighter than deep water', () => {
  assert.ok(lum(seaDepthTint(0.5)) > lum(seaDepthTint(12)));
});
