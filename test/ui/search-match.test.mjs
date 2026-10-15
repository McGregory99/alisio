import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchItems, searchItemsFrom } from '../../src/ui/search-match.mjs';
import { entitiesFromStation } from '../../src/core/station-entities.mjs';
import { MASPALOMAS } from '../../src/data/stations/maspalomas.mjs';
import { MISSIONS } from '../../src/data/missions.mjs';

const items = searchItemsFrom({ missions: MISSIONS, entities: entitiesFromStation(MASPALOMAS) });
const ids = (q) => matchItems(items, q).map((i) => i.id);

test('items cover every mission, antenna and facility', () => {
  assert.equal(items.filter((i) => i.kind === 'satellite').length, 11);
  assert.equal(items.filter((i) => i.kind === 'antenna').length, MASPALOMAS.antennas.length);
  assert.equal(items.filter((i) => i.kind === 'facility').length, MASPALOMAS.facilities.length);
});

test('finds satellites by name or short id, case-insensitively', () => {
  assert.deepEqual(ids('sentinel-2b'), ['sat-42063']);
  assert.ok(ids('s2b').includes('sat-42063'));
});

test('finds antennas and facilities by name', () => {
  assert.ok(ids('15 m').includes('MSP-15'));
  assert.ok(ids('ksat').includes('MSP-KSAT5'));
  assert.ok(ids('power').includes('MSP-POWER'));
});

test('every query token must match and results are capped and ranked by prefix', () => {
  assert.deepEqual(ids('sentinel zzz'), []);
  assert.ok(matchItems(items, 'sentinel', 3).length <= 3);
  assert.equal(matchItems(items, 'rad')[0].id, 'MSP-RADOME');
});

test('an empty query returns nothing', () => {
  assert.deepEqual(matchItems(items, '  '), []);
});
