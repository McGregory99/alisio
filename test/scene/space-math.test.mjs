import test from 'node:test';
import assert from 'node:assert/strict';
import { latLonToXyz, eciToScene, rotateAboutY, equirect, simplifyRing, ringAreaDeg2, graticule, circleOnSphere, footprintRadiusDeg, occludedBySphere, nearestScreenPoint, shouldRebuildOrbits, starField, EARTH_RADIUS_KM } from '../../src/scene/space-math.mjs';
import { gmstRad } from '../../src/core/sgp4.mjs';

const near = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) < e, `${a} vs ${b}`);

test('lat/lon to xyz: equator at lon 0 is +x, the north pole is +y, east is -z', () => {
  const a = latLonToXyz(0, 0, 10); near(a.x, 10); near(a.y, 0); near(a.z, 0);
  const n = latLonToXyz(90, 0, 10); near(n.y, 10); near(n.x, 0);
  const e = latLonToXyz(0, 90, 10); near(e.x, 0); near(e.z, -10);
  for (const [la, lo] of [[27.76, -15.63], [-45, 120], [80, -170]]) { const p = latLonToXyz(la, lo, EARTH_RADIUS_KM); near(Math.hypot(p.x, p.y, p.z), EARTH_RADIUS_KM, 1e-6); }
});

test('ECI maps to the scene without mirroring, and the GMST spin of an Earth-fixed point equals the ECI rotation', () => {
  assert.deepEqual(eciToScene({ x: 1, y: 2, z: 3 }), { x: 1, y: 3, z: -2 });
  // A point at ECF lon 30 deg, lat 20 deg, at GMST g, has ECI longitude 30 + g: both routes give the same scene position.
  const g = 1.1, lat = 20, lon = 30, r = 7000;
  const viaSpin = rotateAboutY(latLonToXyz(lat, lon, r), g);
  const eciLon = lon * Math.PI / 180 + g, la = lat * Math.PI / 180;
  const viaEci = eciToScene({ x: r * Math.cos(la) * Math.cos(eciLon), y: r * Math.cos(la) * Math.sin(eciLon), z: r * Math.sin(la) });
  near(viaSpin.x, viaEci.x, 1e-6); near(viaSpin.y, viaEci.y, 1e-6); near(viaSpin.z, viaEci.z, 1e-6);
});

test('a satellite directly over the station in ECI sits on the station direction after the Earth spin', () => {
  const date = new Date('2026-10-18T09:00:00Z'), g = gmstRad(date);
  const st = { latDeg: 27.76289, lonDeg: -15.6338 };
  const spun = rotateAboutY(latLonToXyz(st.latDeg, st.lonDeg, 1), g);
  const lonEci = st.lonDeg * Math.PI / 180 + g, la = st.latDeg * Math.PI / 180;
  const eci = eciToScene({ x: Math.cos(la) * Math.cos(lonEci), y: Math.cos(la) * Math.sin(lonEci), z: Math.sin(la) });
  near(spun.x, eci.x); near(spun.y, eci.y); near(spun.z, eci.z);
});

test('equirect puts lon -180/lat 90 at the top-left and lon 0/lat 0 at the centre', () => {
  assert.deepEqual(equirect(-180, 90, 200, 100), { x: 0, y: 0 });
  assert.deepEqual(equirect(0, 0, 200, 100), { x: 100, y: 50 });
  assert.deepEqual(equirect(180, -90, 200, 100), { x: 200, y: 100 });
});

test('simplifyRing drops collinear points, keeps corners and tolerates a closing duplicate', () => {
  const sq = [[0, 0], [5, 0], [10, 0], [10, 10], [5, 10], [0, 10], [0, 0]];
  const s = simplifyRing(sq, 0.1);
  assert.equal(s.length, 4);
  near(ringAreaDeg2(s), 100);
  assert.equal(simplifyRing([[0, 0], [1, 0], [1, 1]], 5).length, 3);
});

test('graticule lines stay in range; footprint ring is a circle at the right angular radius', () => {
  for (const l of graticule(30, 5)) for (const p of l) assert.ok(Math.abs(p.latDeg) <= 90 && Math.abs(p.lonDeg) <= 180);
  const r = footprintRadiusDeg(700, 5); assert.ok(r > 20 && r < 22.5, String(r));
  const c = { latDeg: 27.76, lonDeg: -15.63 };
  for (const q of circleOnSphere(c, r, 36)) {
    const a = latLonToXyz(c.latDeg, c.lonDeg, 1), b = latLonToXyz(q.latDeg, q.lonDeg, 1);
    near(Math.acos(a.x * b.x + a.y * b.y + a.z * b.z) * 180 / Math.PI, r, 1e-6);
  }
});

test('occlusion: a point behind the Earth is hidden, one in front or beside it is not', () => {
  const cam = { x: 20000, y: 0, z: 0 };
  assert.equal(occludedBySphere(cam, { x: -7000, y: 0, z: 0 }), true);
  assert.equal(occludedBySphere(cam, { x: 7000, y: 0, z: 0 }), false);
  assert.equal(occludedBySphere(cam, { x: 0, y: 8000, z: 0 }), false);
  assert.equal(occludedBySphere(cam, { x: 0, y: 3000, z: 0 }), true);
});

test('nearestScreenPoint picks the closest point within range and ignores hidden ones', () => {
  const pts = [{ x: 10, y: 10 }, null, { x: 100, y: 100 }, { x: 104, y: 98 }];
  assert.equal(nearestScreenPoint(pts, 103, 99, 20), 3);
  assert.equal(nearestScreenPoint(pts, 300, 300, 20), -1);
});

test('orbits rebuild on first use, new records, or after ten simulated minutes', () => {
  assert.equal(shouldRebuildOrbits({ lastBuildMs: null, nowMs: 0, sameRecords: true }), true);
  assert.equal(shouldRebuildOrbits({ lastBuildMs: 0, nowMs: 300_000, sameRecords: true }), false);
  assert.equal(shouldRebuildOrbits({ lastBuildMs: 0, nowMs: 700_000, sameRecords: true }), true);
  assert.equal(shouldRebuildOrbits({ lastBuildMs: 700_000, nowMs: 0, sameRecords: true }), true, 'time jumped back');
  assert.equal(shouldRebuildOrbits({ lastBuildMs: 0, nowMs: 1, sameRecords: false }), true);
});

test('starField is deterministic and unit length', () => {
  const a = starField(50), b = starField(50);
  assert.deepEqual(a, b);
  for (const s of a) near(Math.hypot(s.x, s.y, s.z), 1, 1e-9);
});
