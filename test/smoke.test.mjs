import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('vendored satellite.js loads under Node ESM and exposes json2satrec', async () => {
  const sat = await import('../vendor/satellite.js-7.1.0/dist/index.js');
  assert.equal(typeof sat.json2satrec, 'function');
  assert.equal(typeof sat.propagate, 'function');
});

test('downlink/index.html reference is untouched by this repo', () => {
  const out = execFileSync('git', ['status', '--porcelain', '--', 'downlink'], { encoding: 'utf8' });
  assert.equal(out.trim(), '');
});
