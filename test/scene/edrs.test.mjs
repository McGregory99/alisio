import test from 'node:test';
import assert from 'node:assert/strict';
import { createEdrs } from '../../src/scene/edrs.mjs';
import { MASPALOMAS } from '../../src/data/stations/maspalomas.mjs';

// Minimal Three.js stand-in: only the scene-graph surface the system uses.
class Obj {
  constructor() { this.children = []; this.parent = null; this.userData = {}; this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } }; this.visible = true; }
  add(...o) { for (const c of o) { c.parent = this; this.children.push(c); } return this; }
  remove(...o) { for (const c of o) { this.children = this.children.filter((x) => x !== c); c.parent = null; } return this; }
}
const THREE = {
  Group: Obj, Mesh: class extends Obj { constructor(g, m) { super(); this.geometry = g; this.material = m; } },
  SphereGeometry: class { dispose() {} }, MeshBasicMaterial: class { dispose() {} },
};
const count = (o) => o.children.reduce((n, c) => n + 1 + count(c), 0);
const make = () => {
  const scene = new Obj();
  const edrs = createEdrs({ THREE, scene, station: MASPALOMAS, makeLabel: () => new Obj() });
  return { scene, edrs };
};

test('EDRS is off by default and the scene graph holds no EDRS element (R8.3)', () => {
  const { scene, edrs } = make();
  assert.equal(edrs.enabled(), false);
  assert.equal(count(scene), 0);
});

test('turning it on shows both relays, turning it off removes every element again', () => {
  const { scene, edrs } = make();
  edrs.setEnabled(true);
  assert.equal(edrs.enabled(), true);
  assert.deepEqual(edrs.names(), ['EDRS-A (9 E)', 'EDRS-C (31 E)']);
  assert.ok(count(scene) > 0);
  edrs.setEnabled(false);
  assert.equal(count(scene), 0);
  assert.deepEqual(edrs.names(), []);
});
