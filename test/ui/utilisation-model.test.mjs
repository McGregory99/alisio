import { test } from 'node:test';
import assert from 'node:assert/strict';
import { antennaUtilisation } from '../../src/ui/utilisation-model.mjs';

const MIN = 60_000, H = 3_600_000;
const p = (id, aosMin, durMin) => ({ id, aos: aosMin * MIN, los: (aosMin + durMin) * MIN });

test('utilisation is the busy share of the window per antenna, clipped to the window', () => {
  const now = 12 * H;
  const entries = [
    { pass: p('a', 12 * 60, 60), antennaId: 'MSP-15' },         // 1 h inside a 24 h window
    { pass: p('b', 12 * 60 + 120, 60), antennaId: 'MSP-15' },   // 1 h more
    { pass: p('c', 12 * 60 + 30, 30), antennaId: 'MSP-KSAT5' },
    { pass: p('d', 12 * 60, 60), antennaId: null },             // unserved: counts for nobody
  ];
  const u = antennaUtilisation(entries, ['MSP-15', 'MSP-KSAT5', 'MSP-S9'], now, { windowMs: 24 * H });
  assert.equal(u.find((x) => x.id === 'MSP-15').share, 2 / 24);
  assert.equal(u.find((x) => x.id === 'MSP-KSAT5').share, 0.5 / 24);
  assert.equal(u.find((x) => x.id === 'MSP-S9').share, 0);
});

test('a pass straddling the window edge only counts its part inside; duplicates count once', () => {
  const now = 12 * H;
  const edge = { pass: p('e', 0, 12 * 60 + 60), antennaId: 'MSP-15' }; // starts at 0 h, window starts at 0 h with 24 h
  const u = antennaUtilisation([edge, edge], ['MSP-15'], now, { windowMs: 24 * H });
  assert.equal(u[0].share, 13 / 24);
  const small = antennaUtilisation([edge], ['MSP-15'], now, { windowMs: 2 * H });
  assert.equal(small[0].share, 1); // window 11..13 h is fully covered
});
