import test from 'node:test';
import assert from 'node:assert/strict';
import { entitiesFromStation } from '../../src/core/station-entities.mjs';
import { MASPALOMAS } from '../../src/data/stations/maspalomas.mjs';
import { fixtureStation } from '../fixtures/station-fixture.mjs';

const ofKind = (list, kind) => list.filter((e) => e.kind === kind);

test('a station with N antennas yields N antenna entities', () => {
  assert.equal(ofKind(entitiesFromStation(MASPALOMAS), 'antenna').length, MASPALOMAS.antennas.length);
  assert.equal(ofKind(entitiesFromStation(fixtureStation), 'antenna').length, 1);
});

test('adding an antenna record adds exactly one entity, no code change', () => {
  const extra = { ...fixtureStation.antennas[0], id: 'FIX-X', layout: { eM: 40, nM: 10 } };
  const more = { ...fixtureStation, antennas: [...fixtureStation.antennas, extra] };
  const before = entitiesFromStation(fixtureStation), after = entitiesFromStation(more);
  assert.equal(after.length, before.length + 1);
  assert.ok(after.some((e) => e.id === 'FIX-X'));
});

test('positions map station east/north metres to scene x east, z south-positive', () => {
  const e = entitiesFromStation(MASPALOMAS).find((x) => x.id === 'MSP-KSAT5');
  assert.deepEqual(e.position, { x: 60, z: 35 });
});

test('fixture station yields only its own entities', () => {
  const ids = entitiesFromStation(fixtureStation).map((e) => e.id);
  assert.deepEqual(ids, ['FIX-13']);
});

test('every entity carries provenance and a label', () => {
  for (const e of entitiesFromStation(MASPALOMAS)) {
    assert.ok(['verified', 'illustrative'].includes(e.provenance), e.id);
    assert.ok(e.label.length > 0, e.id);
  }
});

test('antenna entities expose diameter, flagship flag and a size class', () => {
  const list = ofKind(entitiesFromStation(MASPALOMAS), 'antenna');
  const flagship = list.find((e) => e.flagship);
  assert.equal(flagship.diameterM, 15);
  assert.ok(list.every((e) => e.diameterM <= flagship.diameterM));
});

test('only the egress link to processing sites becomes an entity; EDRS stays out', () => {
  const links = ofKind(entitiesFromStation(MASPALOMAS), 'link');
  assert.deepEqual(links.map((l) => l.id), ['LNK-PAC']);
  assert.equal(links[0].offSite, true);
});
