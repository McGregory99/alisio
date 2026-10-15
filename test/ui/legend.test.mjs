import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEGEND } from '../../src/ui/legend.mjs';

test('the legend explains both provenance values (R7.7)', () => {
  assert.deepEqual(LEGEND.map((l) => l.provenance), ['verified', 'illustrative']);
  assert.match(LEGEND[0].text, /public|confirmed|source/i);
  assert.match(LEGEND[1].text, /placeholder|assumption|not a real/i);
});
