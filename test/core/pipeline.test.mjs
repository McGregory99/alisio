import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pipelineStageAt, STAGES, EGRESS_MS } from '../../src/core/pipeline.mjs';
import { missionByNorad } from '../../src/data/missions.mjs';

const H = 3_600_000;
const pass = { id: 'p', norad: 62261, aos: 1_000_000, tca: 1_300_000, los: 1_600_000 };
const s1 = missionByNorad(62261);
const at = (dt) => pipelineStageAt(pass, s1, pass.los + dt);

test('stage order is L0, off-site L1/L2, archive, distribution', () => {
  assert.deepEqual(STAGES.map((s) => s.id), ['l0', 'l1l2', 'archive', 'distribution']);
});

test('no stage before LOS: the downlink itself belongs to the pass lifecycle', () => {
  assert.equal(pipelineStageAt(pass, s1, pass.los - 1), null);
});

test('stages advance with time after LOS and end at the 24 h archive deadline', () => {
  assert.equal(at(0).id, 'l0');
  assert.equal(at(EGRESS_MS - 1).id, 'l0');
  assert.equal(at(EGRESS_MS).id, 'l1l2');
  assert.equal(at(H - 1).id, 'l1l2');
  assert.equal(at(H).id, 'archive');
  assert.equal(at(3 * H - 1).id, 'archive');
  assert.equal(at(3 * H).id, 'distribution');
  assert.equal(at(24 * H), null);
});

test('data flows over the egress only during the first transfer window', () => {
  assert.equal(at(1000).egress, true);
  assert.equal(at(EGRESS_MS).egress, false);
});

test('labels are generic; non-S1 timing and the egress transfer are marked illustrative', () => {
  for (const s of STAGES) assert.doesNotMatch(s.label, /Frascati|Darmstadt|ESRIN|ESOC|Kiruna/);
  assert.equal(pipelineStageAt(pass, missionByNorad(42063), pass.los + 1).illustrative, true);
  assert.equal(at(EGRESS_MS).illustrative, false); // S1 NRT goal is a verified target
  assert.equal(at(1).illustrative, true); // the egress transfer time is a placeholder
});
