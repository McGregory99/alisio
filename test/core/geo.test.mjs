import { test } from 'node:test';
import assert from 'node:assert/strict';
import { observerEcf, lookAngles, enuFromAzEl, subpoint, geoLookAngles } from '../../src/core/geo.mjs';
import { toSatrec } from '../../src/core/sgp4.mjs';
import { MASPALOMAS } from '../../src/data/stations/maspalomas.mjs';
import { SNAPSHOT } from '../../src/data/omm-snapshot.mjs';

const obs = MASPALOMAS.location;
const above = (altM) => observerEcf({ ...obs, altM: obs.altM + altM });

test('a satellite straight above the observer is at elevation ~90 deg', () => {
  const la = lookAngles(obs, above(700_000));
  assert.ok(Math.abs(la.elDeg - 90) < 1, `el ${la.elDeg}`);
  assert.ok(Math.abs(la.rangeKm - 700) < 1, `range ${la.rangeKm}`);
});

test('a satellite on the far side of the Earth has negative elevation', () => {
  const far = observerEcf({ latDeg: -obs.latDeg, lonDeg: obs.lonDeg + 180, altM: 700_000 });
  assert.ok(lookAngles(obs, far).elDeg < 0);
});

test('enuFromAzEl round-trips with lookAngles', () => {
  const sat = observerEcf({ latDeg: obs.latDeg + 5, lonDeg: obs.lonDeg + 8, altM: 700_000 });
  const la = lookAngles(obs, sat);
  const { e, n, u } = enuFromAzEl(la.azDeg, la.elDeg, la.rangeKm);
  const back = { azDeg: (Math.atan2(e, n) * 180) / Math.PI, elDeg: (Math.asin(u / Math.hypot(e, n, u)) * 180) / Math.PI };
  assert.ok(Math.abs(((back.azDeg - la.azDeg + 540) % 360) - 180) < 1e-6);
  assert.ok(Math.abs(back.elDeg - la.elDeg) < 1e-6);
});

test('enuFromAzEl follows the compass: north az=0, east az=90, zenith el=90', () => {
  const n = enuFromAzEl(0, 0), e = enuFromAzEl(90, 0), z = enuFromAzEl(0, 90);
  assert.ok(Math.abs(n.n - 1) < 1e-9 && Math.abs(e.e - 1) < 1e-9 && Math.abs(z.u - 1) < 1e-9);
});

test('subpoint of a nadir fixture returns the observer lat/lon and altitude', () => {
  const sp = subpoint(above(700_000));
  assert.ok(Math.abs(sp.latDeg - obs.latDeg) < 1e-6 && Math.abs(sp.lonDeg - obs.lonDeg) < 1e-6);
  assert.ok(Math.abs(sp.altKm - 700.205) < 0.01, `alt ${sp.altKm}`);
});

test('geoLookAngles propagates a snapshot satellite to finite look angles', () => {
  const sat = toSatrec(SNAPSHOT.records[0]);
  const la = geoLookAngles(obs, sat, new Date(SNAPSHOT.records[0].EPOCH + 'Z'));
  assert.ok(Number.isFinite(la.azDeg) && Number.isFinite(la.elDeg) && la.rangeKm > 500);
});
