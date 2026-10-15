import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toSatrec, propagateAt } from '../../src/core/sgp4.mjs';
import { findPasses } from '../../src/core/passes.mjs';
import { MASPALOMAS } from '../../src/data/stations/maspalomas.mjs';
import { SNAPSHOT } from '../../src/data/omm-snapshot.mjs';

const start = Date.parse(SNAPSHOT.records[0].EPOCH + 'Z');
const window = { observer: MASPALOMAS.location, startMs: start, endMs: start + 86_400_000 };

test('a corrupted OMM is flagged failed, propagates to null and yields zero passes', () => {
  const bad = toSatrec({ ...SNAPSHOT.records[0], ECCENTRICITY: 5, MEAN_MOTION: -1 });
  assert.equal(bad.failed, true);
  assert.ok(bad.reason);
  assert.equal(propagateAt(bad, new Date(start)), null);
  assert.deepEqual(findPasses({ sat: bad, ...window }), []);
});

test('a record missing required fields is flagged failed rather than throwing', () => {
  assert.equal(toSatrec({ NORAD_CAT_ID: 1 }).failed, true);
  assert.equal(toSatrec(null).failed, true);
});

test('other satellites are unaffected by a failed one', () => {
  const good = toSatrec(SNAPSHOT.records[1]);
  assert.equal(good.failed, false);
  assert.ok(findPasses({ sat: good, ...window }).length > 0);
});
