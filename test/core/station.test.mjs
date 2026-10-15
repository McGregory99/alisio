import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateStation, validateMission } from '../../src/core/station.mjs';
import { MASPALOMAS } from '../../src/data/stations/maspalomas.mjs';
import { MISSIONS } from '../../src/data/missions.mjs';
import { fixtureStation } from '../fixtures/station-fixture.mjs';

const clone = (o) => structuredClone(o);

test('Maspalomas location matches the station record (R1.1)', () => {
  assert.deepEqual(MASPALOMAS.location, { latDeg: 27.76289, lonDeg: -15.6338, altM: 205 });
  assert.deepEqual(validateStation(MASPALOMAS), { ok: true, errors: [] });
});

test('flagship 15 m (Rx S+X, Tx S) and KSAT 5 m are verified (R1.2)', () => {
  const flagship = MASPALOMAS.antennas.find((a) => a.flagship);
  assert.equal(flagship.diameterM, 15);
  assert.deepEqual(flagship.bands, { rx: ['S', 'X'], tx: ['S'] });
  assert.equal(flagship.provenance, 'verified');
  const ksat = MASPALOMAS.antennas.find((a) => a.diameterM === 5);
  assert.equal(ksat.provenance, 'verified');
});

test('power plant existence verified, layout illustrative; other elements illustrative', () => {
  const plant = MASPALOMAS.facilities.find((f) => f.kind === 'power-plant');
  assert.equal(plant.provenance, 'verified');
  assert.deepEqual(plant.illustrative, ['layout']);
  const others = [...MASPALOMAS.facilities.filter((f) => f !== plant), ...MASPALOMAS.antennas.filter((a) => !a.provenance.startsWith('v'))];
  assert.ok(others.length > 0 && others.every((e) => e.provenance === 'illustrative'));
});

test('no antenna declares Ka band (R1.3)', () => {
  for (const a of MASPALOMAS.antennas) {
    assert.ok(![...a.bands.rx, ...a.bands.tx].includes('Ka'), a.id);
  }
});

test('links are generic and EDRS links are historical/optional (R1.5)', () => {
  const generic = MASPALOMAS.links.filter((l) => l.kind !== 'edrs');
  assert.ok(generic.length > 0 && generic.every((l) => l.label === 'Processing & Archiving Centres'));
  const edrs = MASPALOMAS.links.filter((l) => l.kind === 'edrs');
  assert.equal(edrs.length, 2);
  assert.ok(edrs.every((l) => l.historical === true && l.optional === true && l.provenance === 'illustrative'));
  assert.ok(MASPALOMAS.links.every((l) => l.provenance === 'illustrative' || l.kind !== 'processing-site'));
});

test('catalog missions validate (R1.6)', () => {
  for (const m of MISSIONS) assert.deepEqual(validateMission(m), { ok: true, errors: [] }, m.id);
});

// R1.6: one RED test per element kind, each names the offending element.
const rejects = (label, mutate, expectedId) =>
  test(`validator rejects ${label} without provenance and names it`, () => {
    const s = clone(MASPALOMAS);
    mutate(s);
    const r = validateStation(s);
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.includes(expectedId)), r.errors.join('|'));
  });

rejects('a station', (s) => delete s.provenance, MASPALOMAS.id);
rejects('an antenna', (s) => delete s.antennas[1].provenance, MASPALOMAS.antennas[1].id);
rejects('a facility', (s) => { s.facilities[0].provenance = 'maybe'; }, MASPALOMAS.facilities[0].id);
rejects('a link', (s) => delete s.links[0].provenance, MASPALOMAS.links[0].id);

test('validator rejects a mission without provenance and names it', () => {
  const m = clone(MISSIONS[0]);
  delete m.provenance;
  const r = validateMission(m);
  assert.equal(r.ok, false);
  assert.ok(r.errors[0].includes(m.id));
});

test('fixture station validates with no code change (R1.1)', () => {
  assert.deepEqual(validateStation(fixtureStation), { ok: true, errors: [] });
});
