import test from 'node:test';
import assert from 'node:assert/strict';
import { edrsRelays, EDRS_NOTE } from '../../src/core/edrs.mjs';
import { MASPALOMAS } from '../../src/data/stations/maspalomas.mjs';

test('EDRS-A (9 E) and EDRS-C (31 E) come from the station links, in the sky east-south-east of Maspalomas (R8.3)', () => {
  const r = edrsRelays(MASPALOMAS);
  assert.deepEqual(r.map((x) => x.label), ['EDRS-A (9 E)', 'EDRS-C (31 E)']);
  for (const x of r) {
    assert.ok(x.elDeg > 5 && x.elDeg < 60, `${x.label} el ${x.elDeg}`);
    assert.ok(x.azDeg > 90 && x.azDeg < 150, `${x.label} az ${x.azDeg}`);
  }
  assert.ok(r[0].elDeg > r[1].elDeg, 'the nearer longitude stands higher');
});

test('relays are historical, optional, illustrative and carry an unverified-status note', () => {
  for (const x of edrsRelays(MASPALOMAS)) {
    assert.equal(x.historical, true);
    assert.equal(x.optional, true);
    assert.equal(x.provenance, 'illustrative');
  }
  assert.match(EDRS_NOTE, /historical/i);
  assert.match(EDRS_NOTE, /unverified/i);
});

test('a station without EDRS links yields no relays', () => {
  assert.deepEqual(edrsRelays({ ...MASPALOMAS, links: MASPALOMAS.links.filter((l) => l.kind !== 'edrs') }), []);
});
