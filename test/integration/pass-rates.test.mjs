import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findPasses } from '../../src/core/passes.mjs';
import { toSatrec } from '../../src/core/sgp4.mjs';
import { MASPALOMAS } from '../../src/data/stations/maspalomas.mjs';
import { MISSIONS } from '../../src/data/missions.mjs';
import { SNAPSHOT } from '../../src/data/omm-snapshot.mjs';

const DAYS = 7;
const start = Date.parse(SNAPSHOT.records[0].EPOCH + 'Z');

for (const m of MISSIONS) {
  const [lo, hi] = m.family === 'S6' ? [5.1, 6.1] : [4.0, 4.6];
  test(`${m.id}: ${lo}-${hi} passes/day over ${DAYS} days at 5 deg`, () => {
    const sat = toSatrec(SNAPSHOT.records.find((r) => r.NORAD_CAT_ID === m.norad));
    const passes = findPasses({ sat, observer: MASPALOMAS.location, startMs: start, endMs: start + DAYS * 86_400_000, maskDeg: 5 });
    const perDay = passes.length / DAYS;
    assert.ok(perDay >= lo && perDay <= hi, `${m.id} ${perDay.toFixed(2)}/day`);
  });
}
