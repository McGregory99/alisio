import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DISCLAIMER } from '../src/ui/branding.mjs';

// R8.4: README states how to run, data sources, the test command and the disclaimer.
const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');

test('README documents run, data sources, tests and the disclaimer (R8.4, R7.8)', () => {
  assert.match(readme, /npm start/);
  assert.match(readme, /no build/i);
  assert.match(readme, /CelesTrak/);
  assert.match(readme, /2026-10-14/);
  assert.match(readme, /npm test/);
  assert.ok(readme.includes(DISCLAIMER));
  assert.match(readme, /not a live feed/i);
  assert.match(readme, /coast \(compressed, illustrative\)/);
});
