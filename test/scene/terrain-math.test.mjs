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
