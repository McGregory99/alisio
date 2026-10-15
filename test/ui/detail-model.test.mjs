import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orbitParams, formatDoppler, detailRows, TTC_STATEMENT } from '../../src/ui/detail-model.mjs';
import { MISSIONS } from '../../src/data/missions.mjs';
import { SNAPSHOT } from '../../src/data/omm-snapshot.mjs';

const mission = MISSIONS.find((m) => m.id === 'S2B');
const omm = SNAPSHOT.records.find((r) => r.NORAD_CAT_ID === mission.norad);

test('orbit parameters come from the OMM record', () => {
  const p = orbitParams(omm);
  assert.equal(p.inclinationDeg, omm.INCLINATION);
  assert.ok(Math.abs(p.periodMin - 1440 / omm.MEAN_MOTION) < 1e-9);
  assert.ok(p.altitudeKm > 680 && p.altitudeKm < 820, `S2B altitude ${p.altitudeKm}`);
  assert.equal(p.eccentricity, omm.ECCENTRICITY);
});

test('Doppler formatting is signed kHz', () => {
  assert.equal(formatDoppler(123_456), '+123.5 kHz');
  assert.equal(formatDoppler(-8_000), '-8.0 kHz');
  assert.equal(formatDoppler(null), '--');
});

test('rows show mission, orbit, az/el/range and Doppler', () => {
  const rows = detailRows({ mission, omm, state: { azDeg: 123.4, elDeg: 45.6, rangeKm: 987.6, visible: true, antennaId: 'MSP-15' }, dopplerHz: 50_000 });
  const by = Object.fromEntries(rows.map((r) => [r.id, r.value]));
  assert.equal(by.mission, 'Sentinel-2B');
  assert.match(by.azel, /123\.4/);
  assert.match(by.azel, /45\.6/);
  assert.match(by.range, /988 km/);
  assert.equal(by.doppler, '+50.0 kHz');
  assert.match(by.inclination, /98\.5/);
  assert.match(by.period, /min/);
});

test('below the horizon there is no live Doppler', () => {
  const rows = detailRows({ mission, omm, state: { azDeg: 10, elDeg: -20, rangeKm: 5000, visible: false, antennaId: null }, dopplerHz: null });
  assert.equal(rows.find((r) => r.id === 'doppler').value, '--');
});

test('the X-band and TT&C statement is exact (R5.7)', () => {
  assert.equal(TTC_STATEMENT, 'Payload downlink is X-band. Sentinel TT&C prime is Kiruna (S-band capability at Maspalomas shown, not claimed as prime).');
});
