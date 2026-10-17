import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SENTINEL_SPECS, FAMILIES, specFor, displayScale } from '../../src/scene/sentinel-spec.mjs';
import { MISSIONS } from '../../src/data/missions.mjs';

test('all five families are described with positive dimensions', () => {
  assert.deepEqual([...FAMILIES].sort(), ['S1', 'S2', 'S3', 'S5P', 'S6']);
  for (const f of FAMILIES) {
    const s = SENTINEL_SPECS[f];
    for (const k of ['x', 'y', 'z']) assert.ok(s.bus[k] > 0, `${f} bus.${k}`);
    assert.ok(s.maxExtent > 0);
    assert.ok(s.sources.length > 0, `${f} cites sources`);
  }
});

test('feature counts match the real spacecraft', () => {
  assert.ok(SENTINEL_SPECS.S1.sar.length > 12);
  assert.equal(SENTINEL_SPECS.S1.wings, 2);
  assert.equal(SENTINEL_SPECS.S2.wings, 1);
  assert.equal(SENTINEL_SPECS.S3.wings, 1);
  assert.equal(SENTINEL_SPECS.S5P.wings, 1);
  assert.equal(SENTINEL_SPECS.S6.wings, 2);
  assert.ok(SENTINEL_SPECS.S6.altimeter.nadir);
  assert.ok(SENTINEL_SPECS.S3.altimeter.nadir);
  assert.equal(SENTINEL_SPECS.S3.olciCameras, 5);
  for (const f of FAMILIES) assert.ok(SENTINEL_SPECS[f].panels >= 1);
});

test('every catalog mission resolves to a family; unknown ids do not', () => {
  for (const m of MISSIONS) assert.equal(specFor(m.id)?.family, m.family, m.id);
  assert.equal(specFor('S5P').family, 'S5P');
  assert.equal(specFor('S6').family, 'S6');
  assert.equal(specFor('XYZ'), null);
  assert.equal(specFor(undefined), null);
});

test('displayScale keeps every family readable without erasing size differences', () => {
  const scales = FAMILIES.map((f) => displayScale(SENTINEL_SPECS[f]));
  for (const f of FAMILIES) {
    const px = displayScale(SENTINEL_SPECS[f]) * SENTINEL_SPECS[f].maxExtent;
    assert.ok(px >= 20 && px <= 70, `${f} shown extent ${px}`);
  }
  assert.ok(Math.max(...scales) / Math.min(...scales) < 4);
  assert.ok(displayScale(SENTINEL_SPECS.S1) * SENTINEL_SPECS.S1.maxExtent > displayScale(SENTINEL_SPECS.S5P) * SENTINEL_SPECS.S5P.maxExtent);
});
