import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSchedule } from '../../src/core/schedule.mjs';
import { MASPALOMAS } from '../../src/data/stations/maspalomas.mjs';
import { MISSIONS } from '../../src/data/missions.mjs';
import { SNAPSHOT } from '../../src/data/omm-snapshot.mjs';
import { geoLookAngles } from '../../src/core/geo.mjs';

const start = Math.max(...SNAPSHOT.records.map((r) => Date.parse(r.EPOCH + 'Z')));
const make = () => createSchedule({ station: MASPALOMAS, getRecords: () => SNAPSHOT.records });

test('one sky entry per mission, named from the mission catalog', () => {
  const s = make().update(start);
  assert.equal(s.satellites.length, MISSIONS.length);
  assert.deepEqual(s.satellites.map((x) => x.mission.name).sort(), MISSIONS.map((m) => m.name).sort());
});

test('sky entries carry the same az/el as the look-angle function', () => {
  const s = make().update(start);
  for (const x of s.satellites) {
    const la = geoLookAngles(MASPALOMAS.location, x.sat, new Date(start));
    assert.equal(x.azDeg, la.azDeg);
    assert.equal(x.elDeg, la.elDeg);
  }
});

test('an assigned pass occupies its antenna in the downlink phase at TCA', () => {
  const sch = make();
  const first = sch.update(start).assignments.find((a) => a.status === 'assigned');
  assert.ok(first, 'at least one assigned pass in the horizon');
  const s = sch.update(first.pass.tca);
  const lane = s.lanes.get(first.antennaId);
  assert.equal(lane.pass.id, first.pass.id);
  assert.equal(lane.phase, 'downlink');
  assert.equal(lane.mission.norad, first.pass.norad);
});

test('the assigned antenna is reported for a satellite while its pass runs', () => {
  const sch = make();
  const first = sch.update(start).assignments.find((a) => a.status === 'assigned');
  const s = sch.update(first.pass.tca);
  assert.equal(s.satellites.find((x) => x.norad === first.pass.norad).antennaId, first.antennaId);
});

test('finished passes stay listed for the pipeline window and then drop', () => {
  const sch = make();
  const first = sch.update(start).assignments.find((a) => a.status === 'assigned');
  const after = sch.update(first.pass.los + 30 * 60_000);
  assert.ok(after.finished.some((f) => f.pass.id === first.pass.id));
  const later = sch.update(first.pass.los + 25 * 3_600_000);
  assert.ok(!later.finished.some((f) => f.pass.id === first.pass.id));
});
