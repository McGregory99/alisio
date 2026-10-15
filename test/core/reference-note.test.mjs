import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REFERENCE_NOTE } from '../../src/core/pointing.mjs';

test('the reference-point footnote is exported and states both references', () => {
  assert.equal(typeof REFERENCE_NOTE, 'string');
  assert.ok(REFERENCE_NOTE.length > 0);
  assert.match(REFERENCE_NOTE, /geodetic origin/);
  assert.match(REFERENCE_NOTE, /pivot/);
});
