import test from 'node:test';
import assert from 'node:assert/strict';
import { townLots, TOWN_BOX } from '../../src/scene/town-math.mjs';
import { terrainHeight, COAST_Z } from '../../src/scene/terrain-math.mjs';

test('town patch: deterministic, low-rise, on land near the shore south of the campus', () => {
  const a = townLots({ heightAt: terrainHeight }), b = townLots({ heightAt: terrainHeight });
  assert.deepEqual(a, b);
  assert.ok(a.length > 40, 'a patch of buildings, not a handful');
  for (const l of a) {
    assert.ok(l.h >= 6 && l.h <= 19, 'two to five storeys');
    assert.ok(l.x >= TOWN_BOX.x0 - 10 && l.x <= TOWN_BOX.x1 + 10 && l.z >= TOWN_BOX.z0 - 10 && l.z <= TOWN_BOX.z1 + 10);
    assert.ok(l.z < COAST_Z, 'north of the waterline');
  }
});

test('town patch: no building floats or is buried (base below the lowest corner, tops above the highest)', () => {
  for (const l of townLots({ heightAt: terrainHeight })) {
    const hs = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => terrainHeight(l.x + sx * l.w / 2, l.z + sz * l.d / 2));
    assert.ok(l.y0 < Math.min(...hs) && l.y0 > Math.min(...hs) - 2);
    assert.ok(l.y0 + l.h + 1.2 > Math.max(...hs) + 2);
  }
});

test('town patch: lots on steep or sub-sea ground are skipped', () => {
  assert.equal(townLots({ heightAt: () => 0 }).length, 0);
  assert.equal(townLots({ heightAt: (x) => x * 0.5 + 50 }).length, 0);
});
