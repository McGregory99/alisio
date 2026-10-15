import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dishTarget, slewStep, STOW } from '../../src/core/pointing.mjs';
import { findPasses } from '../../src/core/passes.mjs';
import { toSatrec } from '../../src/core/sgp4.mjs';
import { geoLookAngles } from '../../src/core/geo.mjs';
import { MASPALOMAS } from '../../src/data/stations/maspalomas.mjs';
import { SNAPSHOT } from '../../src/data/omm-snapshot.mjs';

const obs = MASPALOMAS.location;
const rec = SNAPSHOT.records.find((r) => r.OBJECT_NAME === 'SENTINEL-2B');
const sat = toSatrec(rec);
const start = Date.parse(rec.EPOCH + 'Z');
const pass = findPasses({ sat, observer: obs, startMs: start, endMs: start + 86_400_000, maskDeg: 5 })[0];
const antenna = MASPALOMAS.antennas[0];
const ctx = { sat, observer: obs };

test('during the pass the target equals the look angles at that time', () => {
  for (const t of [pass.aos + 1000, pass.tca, pass.los - 1000]) {
    const la = geoLookAngles(obs, sat, new Date(t));
    const tg = dishTarget(pass, t, antenna, ctx);
    assert.equal(tg.mode, 'track');
    assert.equal(tg.azDeg, la.azDeg);
    assert.equal(tg.elDeg, la.elDeg);
  }
});

test('before AOS the dish pre-positions at the AOS azimuth', () => {
  const tg = dishTarget(pass, pass.aos - 60_000, antenna, ctx);
  assert.equal(tg.mode, 'pre-position');
  assert.equal(tg.azDeg, pass.aosAzDeg);
});

test('idle (no phase or delivered) returns the stow position', () => {
  assert.deepEqual({ ...dishTarget(pass, pass.aos - 3_600_000, antenna, ctx) }, { ...STOW, mode: 'stow' });
  assert.equal(dishTarget(pass, pass.los + 3_600_000, antenna, ctx).mode, 'stow');
  assert.deepEqual({ ...dishTarget(null, pass.aos, antenna, ctx) }, { ...STOW, mode: 'stow' });
});

test('slew is limited by rate and time step', () => {
  const r = slewStep({ azDeg: 10, elDeg: 10 }, { azDeg: 100, elDeg: 80 }, 3, 2);
  assert.equal(r.azDeg, 16);
  assert.equal(r.elDeg, 16);
});

test('slew arrives exactly and takes the shortest way round the azimuth', () => {
  assert.deepEqual(slewStep({ azDeg: 10, elDeg: 10 }, { azDeg: 12, elDeg: 11 }, 3, 2), { azDeg: 12, elDeg: 11 });
  const r = slewStep({ azDeg: 350, elDeg: 0 }, { azDeg: 10, elDeg: 0 }, 5, 2);
  assert.equal(r.azDeg, 0);
});
