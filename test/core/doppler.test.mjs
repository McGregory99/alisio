import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findPasses, rangeRate, dopplerHz } from '../../src/core/passes.mjs';
import { toSatrec } from '../../src/core/sgp4.mjs';
import { MASPALOMAS } from '../../src/data/stations/maspalomas.mjs';
import { SNAPSHOT } from '../../src/data/omm-snapshot.mjs';

const obs = MASPALOMAS.location;
const rec = SNAPSHOT.records.find((r) => r.OBJECT_NAME === 'SENTINEL-2B');
const sat = toSatrec(rec);
const start = Date.parse(rec.EPOCH + 'Z');
const pass = findPasses({ sat, observer: obs, startMs: start, endMs: start + 86_400_000 }).sort((a, b) => b.maxElDeg - a.maxElDeg)[0];
const F = 8e9;
const shift = (t) => dopplerHz(F, rangeRate(sat, obs, t));

test('8 GHz Doppler is positive at AOS and negative at LOS', () => {
  assert.ok(shift(pass.aos + 1000) > 0);
  assert.ok(shift(pass.los - 1000) < 0);
});

test('Doppler is near zero at TCA and bounded below 250 kHz', () => {
  assert.ok(Math.abs(shift(pass.tca)) < 25_000, `${shift(pass.tca)} Hz at TCA`);
  for (let t = pass.aos; t <= pass.los; t += 10_000) assert.ok(Math.abs(shift(t)) < 250_000);
});

test('range rate is negative while approaching and sign convention is -f*rdot/c', () => {
  assert.ok(rangeRate(sat, obs, pass.aos + 1000) < 0);
  assert.ok(Math.abs(dopplerHz(8e9, -7) - 8e9 * 7000 / 299_792_458) < 1e-3);
});
