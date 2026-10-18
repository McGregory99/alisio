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

test('the sea lies south of the coast: below sea level beyond COAST_Z, land well north of it', () => {
  assert.ok(terrainHeight(0, COAST_Z + 120) < SEA_LEVEL);
  assert.ok(terrainHeight(0, COAST_Z - 150) > SEA_LEVEL);
});

test('ravines: a ridged channel makes some heights lower than the plateau mean nearby', () => {
  const hs = [];
  for (let x = -1000; x <= 1000; x += 20) hs.push(terrainHeight(x, -200)); // barrancos are now a few hundred metres off the campus
  assert.ok(Math.max(...hs) - Math.min(...hs) > 6);
});

import { groundColor, scatterPoints, foamAlpha, seaDepthTint } from '../../src/scene/terrain-math.mjs';

test('mountain backdrop: a high ridge line rises far north of the campus', () => {
  // Old numbers (z = -1000, +40 m / +80 m) belonged to the compressed 36 m campus; the interior now climbs gently from
  // 205 m and the ridges start further north, so compare a farther line.
  const peaks = [];
  for (let x = -600; x <= 600; x += 40) peaks.push(terrainHeight(x, -2800));
  assert.ok(Math.max(...peaks) > 400);
  assert.ok(Math.max(...peaks) > terrainHeight(0, -200) + 150);
  assert.ok(terrainHeight(0, -1000) > terrainHeight(0, -200) + 15);
});

test('the flat campus platform covers the whole fenced campus (fence radius 126 m)', () => {
  for (const [x, z] of [[125, 0], [0, -125], [-90, 88]]) assert.ok(Math.abs(terrainHeight(x, z) - CAMPUS_HEIGHT) < 0.01);
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

test('sea swell stays within its bound, is deterministic and moves with time', async () => {
  const { seaWave, SEA_WAVE_MAX } = await import('../../src/scene/terrain-math.mjs');
  for (let i = 0; i < 400; i++) assert.ok(Math.abs(seaWave(i * 7.3 - 900, i * 3.1, i * 0.37)) <= SEA_WAVE_MAX + 1e-9);
  assert.equal(seaWave(10, 20, 3), seaWave(10, 20, 3));
  assert.notEqual(seaWave(10, 20, 3), seaWave(10, 20, 4));
});

import { surfaceHeight, GRID_X, GRID_Z, gridAxis, shoreZ, barrancoCut, barrancoBed, BARRANCOS, duneMask, baseHeight } from '../../src/scene/terrain-math.mjs';
import { MASPALOMAS } from '../../src/data/stations/maspalomas.mjs';

test('the platform stands 205 m above sea level, the height reported by ESA for the station data', () => {
  assert.equal(CAMPUS_HEIGHT, 205);
  assert.equal(Math.round(MASPALOMAS.location.altM), CAMPUS_HEIGHT);
  assert.equal(terrainHeight(0, 0), CAMPUS_HEIGHT);
  assert.ok(CAMPUS_RADIUS >= 126);
});

test('the coast lies 1,750 m south of the station (ESA) and the shoreline crosses the central meridian there', () => {
  assert.equal(COAST_Z, 1750);
  assert.equal(MASPALOMAS.surroundings.coastDistanceM, COAST_Z);
  assert.equal(shoreZ(0), COAST_Z);
  assert.ok(Math.abs(terrainHeight(0, COAST_Z)) < 2);
  for (let x = -1500; x <= 1500; x += 100) assert.ok(Math.abs(shoreZ(x) - COAST_Z) < 40, `shoreline wanders too far at x=${x}`);
});

test('the terrain descends monotonically in the mean from the campus to sea level at the real mean slope (~11.7 %)', () => {
  const mean = (z) => { let s = 0, n = 0; for (let x = -300; x <= 300; x += 30) { s += terrainHeight(x, z); n++; } return s / n; };
  const zs = [0, 300, 600, 900, 1200, 1500, 1700, COAST_Z];
  for (let i = 1; i < zs.length; i++) assert.ok(mean(zs[i]) < mean(zs[i - 1]), `no descent between z=${zs[i - 1]} and z=${zs[i]}`);
  const slope = (CAMPUS_HEIGHT - terrainHeight(0, COAST_Z)) / COAST_Z;
  assert.ok(slope > 0.105 && slope < 0.125, `mean slope ${slope}`);
});

test('there is dry land right up to the coast and open sea beyond it, never a gap of deep water inland', () => {
  for (let x = -1400; x <= 1400; x += 100) {
    assert.ok(terrainHeight(x, COAST_Z - 120) > 0, `x=${x}`);
    assert.ok(terrainHeight(x, COAST_Z + 150) < 0, `x=${x}`);
  }
});

test('barrancos: each is a dry valley running north to south, 10-40 m deep and 50-260 m wide, with a flat bed', () => {
  assert.ok(BARRANCOS.length >= 2 && BARRANCOS.length <= 3);
  for (const b of BARRANCOS) {
    assert.ok(b.depth >= 10 && b.depth <= 40 && b.width * 2 >= 50 && b.width * 2 <= 260);
    const z = -400, xc = b.x0 + b.amp * Math.sin(z * b.f + b.ph);
    assert.ok(barrancoCut(xc, z) > b.depth * 0.5, 'deep at the axis');
    assert.equal(barrancoCut(xc + b.width + 1, z), 0, 'no cut beyond the valley width');
    assert.ok(Math.abs(barrancoCut(xc + b.bed * 0.5, z) - barrancoCut(xc, z)) < 1e-6, 'flat riverbed');
    assert.ok(barrancoBed(xc, z) > 0.9 && barrancoBed(xc + b.width, z) < 0.01);
    assert.ok(terrainHeight(xc, z) < terrainHeight(xc + b.width + 40, z) - 5, 'the valley floor is below its flanks');
  }
});

test('barrancos shallow out into the shore: never cut below sea level', () => {
  for (const b of BARRANCOS) for (let z = 1000; z <= COAST_Z - 20; z += 50) {
    const xc = b.x0 + b.amp * Math.sin(z * b.f + b.ph);
    assert.ok(terrainHeight(xc, z) >= -0.5, `z=${z}`);
  }
});

test('the dune field is a pale patch east-south-east near the coast, nowhere near the campus', () => {
  assert.ok(duneMask(2600, 1560) > 0.9);
  assert.equal(duneMask(0, 0), 0);
  assert.equal(duneMask(-2000, 1560), 0);
  assert.ok(lum(groundColor({ h: 10, ny: 0.98, n: 0.4, dune: 1 })) > lum(groundColor({ h: 10, ny: 0.98, n: 0.4 })) + 10);
  assert.ok(baseHeight(2600, 1560) > 0);
});

test('the mesh grid is fine around the campus and the shore, coarse far away, and starts/ends beyond the fog distance', () => {
  const step = (axis, v) => { const i = axis.findIndex((a) => a >= v); return axis[i + 1] - axis[i]; };
  assert.equal(step(GRID_X, 0), 10); assert.equal(step(GRID_Z, 0), 10);
  assert.equal(step(GRID_Z, COAST_Z), 20);
  assert.ok(step(GRID_X, 5000) >= 200 && step(GRID_Z, -4000) >= 200);
  assert.ok(GRID_X[0] <= -5000 && GRID_X.at(-1) >= 5000 && GRID_Z[0] <= -4000 && GRID_Z.at(-1) >= 3000);
  assert.deepEqual(gridAxis([[0, 10, 5], [10, 40, 15]]), [0, 5, 10, 25, 40]);
});

test('surfaceHeight is the rendered facet height: equals terrainHeight at mesh nodes and is continuous between them', () => {
  for (const [i, j] of [[20, 30], [GRID_X.length >> 1, GRID_Z.length >> 1], [100, 200]]) assert.ok(Math.abs(surfaceHeight(GRID_X[i], GRID_Z[j]) - terrainHeight(GRID_X[i], GRID_Z[j])) < 1e-6);
  let prev = surfaceHeight(300, 400);
  for (let k = 1; k <= 200; k++) { const h = surfaceHeight(300 + k * 0.5, 400 + k * 0.3); assert.ok(Math.abs(h - prev) < 3); prev = h; }
  assert.equal(surfaceHeight(0, 0), CAMPUS_HEIGHT);
});

test('terrainHeight stays deterministic over a sweep of the whole mesh domain', () => {
  let a = 0, b = 0;
  for (let k = 0; k < 400; k++) { const x = -5000 + k * 25, z = -4000 + k * 18; a += terrainHeight(x, z); }
  for (let k = 0; k < 400; k++) { const x = -5000 + k * 25, z = -4000 + k * 18; b += terrainHeight(x, z); }
  assert.equal(a, b);
});
