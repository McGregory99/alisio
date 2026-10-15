import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MISSIONS } from '../../src/data/missions.mjs';

test('catalog has exactly the 11 active missions', () => {
  assert.equal(MISSIONS.length, 11);
  assert.deepEqual(MISSIONS.map((m) => m.id).sort(), ['S1C', 'S1D', 'S2A', 'S2B', 'S2C', 'S3A', 'S3B', 'S3C', 'S5P', 'S6A', 'S6B']);
});

test('decommissioned S1A and S1B are absent; S3C is 100690', () => {
  const noradIds = MISSIONS.map((m) => m.norad);
  assert.ok(!noradIds.includes(39634) && !noradIds.includes(41456));
  assert.equal(MISSIONS.find((m) => m.id === 'S3C').norad, 100690);
});

test('every mission carries provenance and a downlink band', () => {
  for (const m of MISSIONS) {
    assert.ok(['verified', 'illustrative'].includes(m.provenance), m.id);
    assert.ok(m.downlink?.band, m.id);
  }
});

test('Sentinel-1 core-station role is verified, others illustrative', () => {
  for (const m of MISSIONS) assert.equal(m.provenance, m.family === 'S1' ? 'verified' : 'illustrative', m.id);
});
