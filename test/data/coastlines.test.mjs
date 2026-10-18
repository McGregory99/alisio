import test from 'node:test';
import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { COASTLINES } from '../../src/data/coastlines.mjs';
import { ringsFromGeoJson, build } from '../../tools/build-coastlines.mjs';

test('coastline data is sane: rings of at least 3 finite points inside lon/lat range', () => {
  assert.ok(COASTLINES.length > 40);
  for (const ring of COASTLINES) {
    assert.ok(ring.length >= 3);
    for (const [lon, lat] of ring) {
      assert.ok(Number.isFinite(lon) && Number.isFinite(lat));
      assert.ok(lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90);
    }
  }
});

test('the data module stays compact and rounded to 1 decimal', () => {
  assert.ok(statSync(new URL('../../src/data/coastlines.mjs', import.meta.url)).size <= 62_000);
  for (const ring of COASTLINES) for (const c of ring) for (const v of c) assert.equal(Math.round(v * 10) / 10, v);
});

test('the main land masses are there: Iberia and the Canary latitude band hold land, the mid Atlantic does not', () => {
  const inside = (lon, lat) => COASTLINES.some((ring) => {
    let c = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  });
  assert.ok(inside(-3.7, 40.4), 'Madrid');
  assert.ok(inside(10, 0), 'Gabon');
  assert.ok(inside(-100, 40), 'USA');
  assert.ok(!inside(-30, 30), 'North Atlantic');
  assert.ok(!inside(-150, 0), 'Pacific');
});

test('the build tool rejects untrusted input that is not numeric or out of range', () => {
  const feat = (coordinates) => ({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [coordinates] } }] });
  assert.throws(() => ringsFromGeoJson(feat([[0, 0], ['x', 1], [1, 1]])), /bad coordinate/);
  assert.throws(() => ringsFromGeoJson(feat([[0, 0], [200, 1], [1, 1]])), /bad coordinate/);
  assert.throws(() => ringsFromGeoJson({ type: 'nope' }), /FeatureCollection/);
  const ok = ringsFromGeoJson(feat([[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]));
  assert.equal(build(ok, 0.1).length, 1);
});
