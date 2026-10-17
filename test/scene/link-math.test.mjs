import test from 'node:test';
import assert from 'node:assert/strict';
import { beamSegment, bandStyle, linkPlan, satVariant, pulseFractions } from '../../src/scene/link-math.mjs';

test('beamSegment: midpoint, length and unit direction from dish to satellite', () => {
  const s = beamSegment({ x: 0, y: 10, z: 0 }, { x: 0, y: 10, z: -100 });
  assert.deepEqual(s.mid, { x: 0, y: 10, z: -50 });
  assert.equal(s.length, 100);
  assert.deepEqual(s.dir, { x: 0, y: 0, z: -1 });
});

test('beamSegment: a start offset along the direction shortens the beam (feed sits ahead of the pivot)', () => {
  const s = beamSegment({ x: 0, y: 0, z: 0 }, { x: 300, y: 0, z: 0 }, 20);
  assert.equal(s.length, 280);
  assert.equal(s.mid.x, 160);
});

test('beamSegment: coincident points give a zero-length, finite segment', () => {
  const s = beamSegment({ x: 1, y: 2, z: 3 }, { x: 1, y: 2, z: 3 });
  assert.equal(s.length, 0);
  assert.ok(Number.isFinite(s.dir.x) && Number.isFinite(s.dir.y) && Number.isFinite(s.dir.z));
});

test('bandStyle: X and S bands have different colours; unknown bands fall back to X', () => {
  assert.notEqual(bandStyle('X').hex, bandStyle('S').hex);
  assert.deepEqual(bandStyle('Ka'), bandStyle('X'));
});

test('linkPlan: the payload beam exists only while downlinking; pre-position and LOS show none', () => {
  const ant = { bands: { rx: ['S', 'X'], tx: ['S'] }, roles: ['payload-downlink', 'ttc'] };
  assert.equal(linkPlan('pre-position', ant, 'X').beam, false);
  assert.equal(linkPlan('los', ant, 'X').beam, false);
  const p = linkPlan('downlink', ant, 'X');
  assert.equal(p.beam, true);
  assert.equal(p.band, 'X');
});

test('linkPlan: TT&C uplink pulses need a TT&C role and an S-band transmitter', () => {
  const ttc = { bands: { rx: ['S'], tx: ['S'] }, roles: ['ttc'] };
  const payloadOnly = { bands: { rx: ['S', 'X'], tx: ['S'] }, roles: ['payload-downlink'] };
  const noTx = { bands: { rx: ['X'], tx: [] }, roles: ['payload-downlink', 'ttc'] };
  assert.equal(linkPlan('downlink', ttc, 'X').uplink, true);
  assert.equal(linkPlan('downlink', payloadOnly, 'X').uplink, false);
  assert.equal(linkPlan('downlink', noTx, 'X').uplink, false);
  assert.equal(linkPlan('pre-position', ttc, 'X').uplink, false);
});

test('satVariant: S1 carries a radar antenna, S2 a single wing; unknown family gets the default bus', () => {
  assert.equal(satVariant('S1').radar, true);
  assert.equal(satVariant('S2').wings, 1);
  assert.equal(satVariant('S1').wings, 2);
  assert.deepEqual(satVariant('??'), satVariant('default'));
});

test('pulseFractions: n evenly spaced values in [0,1), moving with time, direction outwards', () => {
  const a = pulseFractions(4, 0), b = pulseFractions(4, 0.1);
  assert.equal(a.length, 4);
  assert.ok(a.every((u) => u >= 0 && u < 1));
  assert.ok(b[0] > a[0]);
});
