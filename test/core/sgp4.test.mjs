import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toSatrec, propagateAt } from '../../src/core/sgp4.mjs';
import { SNAPSHOT } from '../../src/data/omm-snapshot.mjs';
import { MISSIONS } from '../../src/data/missions.mjs';

const omm = (norad) => SNAPSHOT.records.find((r) => r.NORAD_CAT_ID === norad);

test('S3C (NORAD 100690, beyond 5 digits) builds a satrec and propagates at epoch', () => {
  const sat = toSatrec(omm(100690));
  assert.equal(sat.failed, false);
  const at = propagateAt(sat, new Date(omm(100690).EPOCH + 'Z'));
  const r = Math.hypot(at.position.x, at.position.y, at.position.z);
  assert.ok(r > 6900 && r < 7400, `orbit radius ${r} km`);
});

test('snapshot holds the 11 catalog missions, all with satrec.error === 0', () => {
  assert.equal(SNAPSHOT.records.length, 11);
  assert.deepEqual(SNAPSHOT.records.map((r) => r.NORAD_CAT_ID).sort(), MISSIONS.map((m) => m.norad).sort());
  for (const r of SNAPSHOT.records) assert.equal(toSatrec(r).satrec.error, 0, r.OBJECT_NAME);
  assert.match(SNAPSHOT.fetchedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test('a corrupted OMM is flagged failed and propagates to null', () => {
  const bad = { ...omm(100690), ECCENTRICITY: 5, MEAN_MOTION: -1 };
  const sat = toSatrec(bad);
  assert.equal(sat.failed, true);
  assert.equal(propagateAt(sat, new Date(bad.EPOCH + 'Z')), null);
});
