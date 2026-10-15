import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

// R4.6: no fantasy or out-of-scope elements in the scene sources.
const FORBIDDEN = /\b(ship|boat|harbou?r|village|aurora|vehicle|fjord|snow)\b/i;

test('scene sources contain no ship, harbour, village, aurora, vehicle, fjord or snow', () => {
  const dir = new URL('../../src/scene/', import.meta.url);
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.mjs'))) {
    const hit = readFileSync(new URL(f, dir), 'utf8').match(FORBIDDEN);
    assert.equal(hit, null, `${f} mentions "${hit?.[0]}"`);
  }
});
