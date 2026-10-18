import { test } from 'node:test';
import assert from 'node:assert/strict';
import { areasFor, stationChoices } from '../../src/ui/areas.mjs';
import { MASPALOMAS } from '../../src/data/stations/maspalomas.mjs';
import { fixtureStation } from '../fixtures/station-fixture.mjs';
import { COAST_Z } from '../../src/scene/terrain-math.mjs';

const flat = () => 0;

test('five presets: campus overview, flagship dish, coast/sea, processing, orbit view', () => {
  assert.deepEqual(areasFor(MASPALOMAS, { heightAt: flat }).map((a) => a.id), ['campus', 'flagship', 'coast', 'processing', 'orbit']);
});

test('the flagship preset targets the flagship antenna of the station data', () => {
  const a = areasFor(MASPALOMAS, { heightAt: flat }).find((x) => x.id === 'flagship');
  assert.equal(a.target.x + 0, 0); assert.equal(a.target.z + 0, 0);
  const noFlag = { ...fixtureStation, antennas: [{ ...fixtureStation.antennas[0], flagship: false, layout: { eM: 12, nM: 0 } }] };
  assert.equal(areasFor(noFlag, { heightAt: flat }).find((x) => x.id === 'flagship').target.x, 12); // falls back to the first antenna
});

test('the coast preset looks at the shoreline, 1,750 m south of the station', () => {
  const a = areasFor(MASPALOMAS, { heightAt: flat }).find((x) => x.id === 'coast');
  assert.equal(a.target.z, COAST_Z);
  assert.equal(COAST_Z, 1750);
});

test('every preset keeps its distance within the camera maximum', () => {
  for (const a of areasFor(MASPALOMAS, { heightAt: flat })) assert.ok(a.dist > 25 && a.dist <= 1400, a.id);
});

test('stations are listed only when the data holds more than one', () => {
  assert.deepEqual(stationChoices([MASPALOMAS]), []);
  assert.deepEqual(stationChoices([MASPALOMAS, fixtureStation]).map((s) => s.id), ['MSP', 'FIX']);
});

test('the processing preset looks along the egress link, west of the campus building', () => {
  const a = areasFor(MASPALOMAS, { heightAt: flat }).find((x) => x.id === 'processing');
  assert.equal(a.label, 'Processing');
  assert.ok(a.target.x < -100);
});

test('with the real terrain the coast and orbit presets frame points above the ground and the camera ends above it', async () => {
  const { terrainHeight } = await import('../../src/scene/terrain-math.mjs');
  const areas = areasFor(MASPALOMAS, { heightAt: terrainHeight });
  const orbit = areas.find((x) => x.id === 'orbit'), coast = areas.find((x) => x.id === 'coast');
  assert.ok(orbit.target.y > terrainHeight(0, 0) + 50, 'orbit target hovers above the 205 m platform');
  assert.ok(coast.target.y > terrainHeight(0, COAST_Z));
  for (const a of areas) {
    const len = Math.hypot(a.dirFrom.x, a.dirFrom.y, a.dirFrom.z), k = a.dist / len;
    const camY = a.target.y + a.dirFrom.y * k, camX = a.target.x + a.dirFrom.x * k, camZ = a.target.z + a.dirFrom.z * k;
    assert.ok(camY > terrainHeight(camX, camZ), `${a.id} camera starts below the ground`);
  }
});
