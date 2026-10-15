import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findPasses, sampleTrack } from '../../src/core/passes.mjs';
import { toSatrec } from '../../src/core/sgp4.mjs';
import { geoLookAngles } from '../../src/core/geo.mjs';
import { MASPALOMAS } from '../../src/data/stations/maspalomas.mjs';
import { SNAPSHOT } from '../../src/data/omm-snapshot.mjs';

const obs = MASPALOMAS.location;
const rec = SNAPSHOT.records.find((r) => r.OBJECT_NAME === 'SENTINEL-2B');
const sat = toSatrec(rec);
const start = Date.parse(rec.EPOCH + 'Z');
const DAY = 86_400_000;
const run = (over = {}) => findPasses({ sat, observer: obs, startMs: start, endMs: start + DAY, maskDeg: 5, ...over });

test('refined AOS/LOS are within 2 s of a 1 s brute-force reference', () => {
  const passes = run();
  assert.ok(passes.length >= 3);
  const el = (t) => geoLookAngles(obs, sat, new Date(t)).elDeg - 5;
  const ref = [];
  for (let t = start; t < start + DAY; t += 1000) {
    if (el(t) <= 0 && el(t + 1000) > 0) ref.push({ aos: t + 500 });
    if (el(t) > 0 && el(t + 1000) <= 0) (ref.at(-1) ?? {}).los = t + 500;
  }
  const complete = ref.filter((r) => r.aos && r.los && r.los > r.aos);
  assert.ok(complete.length >= 3);
  for (const r of complete) {
    const p = passes.find((x) => Math.abs(x.aos - r.aos) < 5000);
    assert.ok(p, `no pass for AOS ${r.aos}`);
    assert.ok(Math.abs(p.aos - r.aos) <= 2000 && Math.abs(p.los - r.los) <= 2000);
  }
});

test('raising the mask from 5 to 10 deg never adds passes and every maxEl >= 10', () => {
  const low = run(), high = run({ maskDeg: 10 });
  assert.ok(high.length <= low.length);
  assert.ok(high.every((p) => p.maxElDeg >= 10));
});

test('mask per antenna: two masks on the same window yield different pass sets', () => {
  const a = run({ maskDeg: 5 }), b = run({ maskDeg: 40 });
  assert.notDeepEqual(a.map((p) => p.aos), b.map((p) => p.aos));
  assert.ok(b.length < a.length);
});

test('ordering AOS < TCA < LOS and no overlap between consecutive passes', () => {
  const passes = run({ endMs: start + 3 * DAY });
  passes.forEach((p, i) => {
    assert.ok(p.aos < p.tca && p.tca < p.los, `pass ${i}`);
    if (i) assert.ok(passes[i - 1].los < p.aos);
  });
});

test('a window that starts inside a pass back-scans to the true AOS', () => {
  const [p] = run();
  const mid = Math.round((p.aos + p.los) / 2);
  const [q] = run({ startMs: mid, endMs: mid + 3_600_000 });
  assert.ok(Math.abs(q.aos - p.aos) <= 1000 && Math.abs(q.los - p.los) <= 1000);
});

test('sampleTrack returns az/el/range samples between AOS and LOS', () => {
  const [p] = run();
  const track = sampleTrack(sat, obs, p.aos, p.los, 10);
  assert.ok(track.length > 10);
  assert.ok(track.every((s) => Number.isFinite(s.azDeg) && s.rangeKm > 0));
  assert.ok(Math.max(...track.map((s) => s.elDeg)) <= p.maxElDeg + 0.01);
});
