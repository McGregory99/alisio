import test from 'node:test';
import assert from 'node:assert/strict';
import { ringRoad, spurTo, resample, ribbonXZ, fencePosts, lShapedRun, polylineLength, RING_R } from '../../src/scene/campus-math.mjs';

const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

test('ringRoad: closed loop of points all at the ring radius', () => {
  const pts = ringRoad(RING_R, 48);
  assert.equal(pts.length, 48);
  for (const p of pts) assert.ok(Math.abs(Math.hypot(p.x, p.z) - RING_R) < 1e-9);
});

test('spurTo: a straight service road from a campus point ends on the ring, along the radial direction', () => {
  const pts = spurTo({ x: 60, z: 35 }, RING_R);
  assert.deepEqual(pts[0], { x: 60, z: 35 });
  const end = pts[pts.length - 1];
  assert.ok(Math.abs(Math.hypot(end.x, end.z) - RING_R) < 1e-6);
  assert.ok(Math.abs(end.x / end.z - 60 / 35) < 1e-6);
});

test('spurTo: a point at the campus centre still gets a finite road (towards the south gate)', () => {
  const pts = spurTo({ x: 0, z: 0 }, RING_R);
  const end = pts[pts.length - 1];
  assert.ok(Number.isFinite(end.x) && Number.isFinite(end.z));
  assert.ok(Math.abs(Math.hypot(end.x, end.z) - RING_R) < 1e-6);
});

test('resample: points are at most `step` apart and the end points are kept', () => {
  const out = resample([{ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 10, z: 7 }], 2);
  assert.deepEqual(out[0], { x: 0, z: 0 });
  assert.deepEqual(out[out.length - 1], { x: 10, z: 7 });
  for (let i = 1; i < out.length; i++) assert.ok(dist(out[i - 1], out[i]) <= 2 + 1e-9);
});

test('ribbonXZ: two vertices per point, offset perpendicular by the half width; two triangles per segment', () => {
  const r = ribbonXZ([{ x: 0, z: 0 }, { x: 10, z: 0 }], 2);
  assert.equal(r.verts.length, 4);
  assert.equal(r.indices.length, 6);
  const [l, rr] = [r.verts[0], r.verts[1]];
  assert.ok(Math.abs(dist(l, rr) - 4) < 1e-9);
  assert.ok(Math.abs(l.x) < 1e-9 && Math.abs(rr.x) < 1e-9); // perpendicular to an x-aligned segment
});

test('fencePosts: evenly spaced on the radius with a gap for the gate', () => {
  const gate = { angleRad: Math.PI / 2, widthM: 14 };
  const posts = fencePosts(125, 6, gate);
  assert.ok(posts.length > 100);
  for (const p of posts) assert.ok(Math.abs(Math.hypot(p.x, p.z) - 125) < 1e-6);
  const gatePoint = { x: 0, z: 125 }; // angle pi/2 is the south direction (+z)
  assert.ok(posts.every((p) => dist(p, gatePoint) > 6));
});

test('lShapedRun: a cable run leaves one point along x then z and arrives exactly at the other', () => {
  const run = lShapedRun({ x: 0, z: 0 }, { x: 30, z: -20 });
  assert.deepEqual(run[0], { x: 0, z: 0 });
  assert.deepEqual(run[run.length - 1], { x: 30, z: -20 });
  assert.equal(run.length, 3);
  assert.ok(Math.abs(polylineLength(run) - 50) < 1e-9);
});
