import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPassCache } from '../../src/core/pass-cache.mjs';

const H = 3_600_000;
const T0 = Date.UTC(2026, 9, 15, 0, 0, 0);
const rec = (norad, epoch = 'e1') => ({ norad, epoch });
const mkScan = () => {
  const calls = [];
  const scan = (record, startMs, endMs) => {
    calls.push({ norad: record.norad, startMs, endMs });
    // one synthetic 10 min pass at the start of every scanned window
    return [{ id: `${record.norad}-${startMs}`, norad: record.norad, aos: startMs + 60_000, tca: startMs + 360_000, los: startMs + 660_000, maxElDeg: 40 }];
  };
  return { scan, calls };
};

test('the first ensure scans the first 6 h synchronously and nothing beyond now + 24 h', () => {
  const { scan, calls } = mkScan();
  const cache = createPassCache({ scan });
  cache.ensure([rec(1)], T0);
  assert.equal(calls[0].startMs, T0);
  assert.equal(cache.scannedUntil(1), T0 + 6 * H);
  for (let i = 0; i < 40; i++) cache.ensure([rec(1)], T0);
  assert.equal(cache.scannedUntil(1), T0 + 24 * H);
  assert.ok(calls.every((c) => c.endMs <= T0 + 24 * H));
});

test('the rest of the horizon respects the per-call scan budget', () => {
  const { scan, calls } = mkScan();
  const cache = createPassCache({ scan, budgetScans: 2 });
  cache.ensure([rec(1)], T0);
  const before = calls.length;
  cache.ensure([rec(1)], T0);
  assert.equal(calls.length - before, 2);
});

test('the horizon moves with now', () => {
  const { scan } = mkScan();
  const cache = createPassCache({ scan });
  for (let i = 0; i < 40; i++) cache.ensure([rec(1)], T0);
  for (let i = 0; i < 40; i++) cache.ensure([rec(1)], T0 + 5 * H);
  assert.equal(cache.scannedUntil(1), T0 + 29 * H);
});

test('a changed record invalidates its cache only', () => {
  const { scan, calls } = mkScan();
  const cache = createPassCache({ scan });
  cache.ensure([rec(1), rec(2)], T0);
  const n = calls.length;
  cache.ensure([rec(1, 'e2'), rec(2)], T0);
  const rescanned = calls.slice(n).filter((c) => c.startMs === T0);
  assert.deepEqual(rescanned.map((c) => c.norad), [1]);
  assert.ok(cache.scannedUntil(1) >= T0 + 6 * H);
});

test('passes are merged across missions, sorted by AOS and past passes are dropped', () => {
  const { scan } = mkScan();
  const cache = createPassCache({ scan });
  cache.ensure([rec(1), rec(2)], T0);
  const all = cache.passes(T0);
  assert.ok(all.length >= 2);
  assert.deepEqual(all.map((p) => p.aos), [...all.map((p) => p.aos)].sort((a, b) => a - b));
  assert.ok(cache.passes(T0 + 2 * H).every((p) => p.los >= T0 + 2 * H));
});
