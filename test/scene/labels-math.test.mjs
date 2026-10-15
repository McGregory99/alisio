import test from 'node:test';
import assert from 'node:assert/strict';
import { labelText, badgeFor } from '../../src/scene/labels-math.mjs';
import { entitiesFromStation } from '../../src/core/station-entities.mjs';
import { MASPALOMAS } from '../../src/data/stations/maspalomas.mjs';

const byId = (id) => entitiesFromStation(MASPALOMAS).find((e) => e.id === id);

test('an illustrative building is labelled as an artistic placeholder', () => {
  const t = labelText(byId('MSP-OPS'));
  assert.match(t.title, /Operations building/);
  assert.match(t.badge, /illustrative/);
  assert.match(t.note, /artistic placeholder/);
});

test('the verified 15 m flagship says verified and flags its illustrative fields', () => {
  const t = labelText(byId('MSP-15'));
  assert.equal(t.badge, 'verified');
  assert.match(t.note, /layout/);
  assert.doesNotMatch(t.note, /artistic placeholder/);
});

test('an illustrative antenna is an artistic placeholder', () => {
  assert.match(labelText(byId('MSP-S9')).note, /artistic placeholder/);
});

test('the egress link is labelled generic', () => {
  const t = labelText(byId('LNK-PAC'));
  assert.match(t.title, /Processing & Archiving Centres/);
  assert.match(t.note, /generic/);
});

test('badge colours differ by provenance', () => {
  assert.notEqual(badgeFor('verified').color, badgeFor('illustrative').color);
});
