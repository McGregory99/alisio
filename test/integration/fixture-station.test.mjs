import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findPasses } from '../../src/core/passes.mjs';
import { toSatrec } from '../../src/core/sgp4.mjs';
import { fixtureStation } from '../fixtures/station-fixture.mjs';
import { SNAPSHOT } from '../../src/data/omm-snapshot.mjs';

test('passes are predicted for a second station with no code change', () => {
  const start = Date.parse(SNAPSHOT.records[0].EPOCH + 'Z');
  const sat = toSatrec(SNAPSHOT.records[0]);
  const passes = findPasses({ sat, observer: fixtureStation.location, startMs: start, endMs: start + 86_400_000, maskDeg: fixtureStation.maskDeg });
  assert.ok(passes.length >= 4, `${passes.length} passes`);
  assert.ok(passes.every((p) => p.aos < p.tca && p.tca < p.los));
});
