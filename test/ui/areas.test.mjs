import { test } from 'node:test';
import assert from 'node:assert/strict';
import { areasFor, stationChoices } from '../../src/ui/areas.mjs';
import { MASPALOMAS } from '../../src/data/stations/maspalomas.mjs';
import { fixtureStation } from '../fixtures/station-fixture.mjs';
import { COAST_Z } from '../../src/scene/terrain-math.mjs';

const flat = () => 0;

test('four presets: campus overview, flagship dish, coast/sea, orbit view', () => {
  assert.deepEqual(areasFor(MASPALOMAS, { heightAt: flat }).map((a) => a.id), ['campus', 'flagship', 'coast', 'orbit']);
});

test('the flagship preset targets the flagship antenna of the station data', () => {
  const a = areasFor(MASPALOMAS, { heightAt: flat }).find((x) => x.id === 'flagship');
  assert.equal(a.target.x + 0, 0); assert.equal(a.target.z + 0, 0);
  const noFlag = { ...fixtureStation, antennas: [{ ...fixtureStation.antennas[0], flagship: false, layout: { eM: 12, nM: 0 } }] };
  assert.equal(areasFor(noFlag, { heightAt: flat }).find((x) => x.id === 'flagship').target.x, 12); // falls back to the first antenna
});

test('the coast preset looks toward the compressed coast', () => {
  const a = areasFor(MASPALOMAS, { heightAt: flat }).find((x) => x.id === 'coast');
  assert.equal(a.target.z, COAST_Z);
});

test('every preset keeps its distance within the camera maximum', () => {
  for (const a of areasFor(MASPALOMAS, { heightAt: flat })) assert.ok(a.dist > 25 && a.dist <= 1400, a.id);
});

test('stations are listed only when the data holds more than one', () => {
  assert.deepEqual(stationChoices([MASPALOMAS]), []);
  assert.deepEqual(stationChoices([MASPALOMAS, fixtureStation]).map((s) => s.id), ['MSP', 'FIX']);
});
