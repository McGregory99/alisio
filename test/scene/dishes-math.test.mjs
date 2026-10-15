import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dishRotation, boresight, advanceDish } from '../../src/scene/dishes-math.mjs';
import { sceneFromEnu } from '../../src/scene/sky-math.mjs';
import { enuFromAzEl } from '../../src/core/geo.mjs';
import { STOW } from '../../src/core/pointing.mjs';
import { createSchedule } from '../../src/core/schedule.mjs';
import { MASPALOMAS } from '../../src/data/stations/maspalomas.mjs';
import { SNAPSHOT } from '../../src/data/omm-snapshot.mjs';

test('the rotated boresight points along the scene direction of az/el', () => {
  for (const [az, el] of [[0, 0], [90, 30], [180, 60], [270, 10], [33, 77], [0, 90]]) {
    const b = boresight(dishRotation(az, el));
    const w = sceneFromEnu(enuFromAzEl(az, el));
    assert.ok(Math.hypot(b.x - w.x, b.y - w.y, b.z - w.z) < 1e-9, `${az}/${el}`);
  }
});

test('stow (zenith) leaves the bowl pointing up', () => {
  const b = boresight(dishRotation(STOW.azDeg, STOW.elDeg));
  assert.ok(Math.abs(b.y - 1) < 1e-9);
});

const start = Math.max(...SNAPSHOT.records.map((r) => Date.parse(r.EPOCH + 'Z')));
const antenna = MASPALOMAS.antennas[0];
const sch = createSchedule({ station: MASPALOMAS, getRecords: () => SNAPSHOT.records });
const first = sch.update(start).assignments.find((a) => a.status === 'assigned' && a.antennaId === antenna.id);
const ctx = (lane) => ({ lane, antenna, observer: MASPALOMAS.location });

test('an idle dish stays stowed', () => {
  const r = advanceDish({ azDeg: 0, elDeg: 90 }, ctx(null), first.pass.aos - 3_600_000, 1000);
  assert.deepEqual({ azDeg: r.azDeg, elDeg: r.elDeg }, STOW);
});

test('a tracking dish moves toward the look angles by at most the slew rate in sim time', () => {
  const t = first.pass.tca;
  const lane = sch.update(t).lanes.get(antenna.id);
  const r = advanceDish({ azDeg: 0, elDeg: 90 }, ctx(lane), t, 2000);
  assert.ok(Math.abs(r.elDeg - 90) <= antenna.slewDegS * 2 + 1e-9);
  assert.equal(r.mode, 'track');
});

test('a paused or backwards clock never moves the dish', () => {
  const t = first.pass.tca;
  const lane = sch.update(t).lanes.get(antenna.id);
  const cur = { azDeg: 10, elDeg: 20 };
  for (const dt of [0, -5000]) {
    const r = advanceDish(cur, ctx(lane), t, dt);
    assert.equal(r.azDeg, 10); assert.equal(r.elDeg, 20);
  }
});
