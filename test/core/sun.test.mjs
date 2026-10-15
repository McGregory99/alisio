import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sunAzEl } from '../../src/core/sun.mjs';
import { MASPALOMAS } from '../../src/data/stations/maspalomas.mjs';

const obs = MASPALOMAS.location;

test('summer solstice noon UTC: sun high above Maspalomas (> 60 deg)', () => {
  assert.ok(sunAzEl(new Date('2026-06-21T12:00:00Z'), obs).elDeg > 60);
});

test('local midnight (UTC midnight, Canary time is UTC+0/+1): sun below the horizon', () => {
  assert.ok(sunAzEl(new Date('2026-06-21T00:00:00Z'), obs).elDeg < 0);
  assert.ok(sunAzEl(new Date('2026-12-21T00:00:00Z'), obs).elDeg < 0);
});

test('winter noon is lower than summer noon and the sun is south of the station', () => {
  const w = sunAzEl(new Date('2026-12-21T12:00:00Z'), obs);
  assert.ok(w.elDeg > 30 && w.elDeg < 45, `el ${w.elDeg}`);
  assert.ok(w.azDeg > 150 && w.azDeg < 210, `az ${w.azDeg}`);
});
