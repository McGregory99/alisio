import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrbitSource, GROUP_URL, GATE_MS } from '../../src/core/orbit-source.mjs';
import { MISSIONS } from '../../src/data/missions.mjs';
import { SNAPSHOT } from '../../src/data/omm-snapshot.mjs';

const H = 3_600_000;
const T0 = new Date('2026-10-15T12:00:00Z');

function memStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, String(v)), m };
}
function clock(start = T0) {
  let t = start.getTime();
  return { now: () => new Date(t), advance: (ms) => (t += ms) };
}
const okResponse = (body) => ({ ok: true, status: 200, json: async () => body });
const status = (code) => ({ ok: false, status: code, json: async () => ({}) });
/** Fresh copies of the snapshot records, epoch bumped so they win over the snapshot. */
const liveRecords = (epoch = '2026-10-15T10:00:00.000000') => SNAPSHOT.records.map((r) => ({ ...r, EPOCH: epoch }));
function setup({ responses = [okResponse(liveRecords())], storage = memStorage() } = {}) {
  const c = clock();
  const calls = [];
  const queue = [...responses];
  const fetchFn = async (url) => (calls.push(url), queue.length > 1 ? queue.shift() : queue[0]);
  const src = createOrbitSource({ snapshot: SNAPSHOT, catalog: MISSIONS, fetchFn, storage, now: c.now });
  return { src, calls, c, storage };
}

test('creation and load perform zero fetch calls and expose the snapshot', () => {
  const { src, calls } = setup();
  assert.equal(calls.length, 0);
  assert.equal(src.current().source, 'snapshot');
  assert.equal(src.current().records.length, 11);
  assert.equal(src.status().state, 'idle');
});

test('refresh issues exactly one request to the grouped GP URL', async () => {
  const { src, calls } = setup();
  const r = await src.refresh();
  assert.equal(r.outcome, 'ok');
  assert.deepEqual(calls, [GROUP_URL]);
  assert.equal(GROUP_URL, 'https://celestrak.org/NORAD/elements/gp.php?NAME=SENTINEL&FORMAT=JSON');
  assert.equal(src.current().source, 'live');
});

test('gate: a second refresh at T+1h does not fetch and reports the next allowed time', async () => {
  const { src, calls, c } = setup();
  await src.refresh();
  c.advance(H);
  const r = await src.refresh();
  assert.equal(calls.length, 1);
  assert.equal(r.outcome, 'gated');
  assert.equal(r.nextAllowedAt.getTime(), T0.getTime() + GATE_MS);
  assert.equal(src.status().nextAllowedAt.getTime(), T0.getTime() + 2 * H);
});

test('gate: at T+2h exactly one more request is allowed', async () => {
  const { src, calls, c } = setup();
  await src.refresh();
  c.advance(2 * H);
  assert.equal((await src.refresh()).outcome, 'ok');
  assert.equal(calls.length, 2);
});

test('gate is persisted before the fetch and survives a new instance', async () => {
  const storage = memStorage();
  let seenDuringFetch;
  const c = clock();
  const fetchFn = async () => ((seenDuringFetch = storage.getItem('alisio.orbit.lastAttempt')), okResponse(liveRecords()));
  const src = createOrbitSource({ snapshot: SNAPSHOT, catalog: MISSIONS, fetchFn, storage, now: c.now });
  await src.refresh();
  assert.equal(Number(seenDuringFetch), T0.getTime());
  const again = setup({ storage });
  assert.equal((await again.src.refresh()).outcome, 'gated');
  assert.equal(again.calls.length, 0);
});

test('storage failure falls back to an in-memory gate', async () => {
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  const { src, calls, c } = setup({ storage: broken });
  await src.refresh();
  c.advance(H);
  assert.equal((await src.refresh()).outcome, 'gated');
  assert.equal(calls.length, 1);
});

for (const code of [403, 404]) {
  test(`HTTP ${code}: one call, snapshot stays, state blocked, no retry after any wait`, async () => {
    const { src, calls, c } = setup({ responses: [status(code)] });
    const r = await src.refresh();
    assert.equal(r.outcome, 'blocked');
    assert.equal(src.current().source, 'snapshot');
    assert.equal(src.status().state, 'blocked');
    c.advance(48 * H);
    assert.equal((await src.refresh()).outcome, 'blocked');
    assert.equal(calls.length, 1);
  });
}

test('network error keeps data, records the attempt time, does not retry on its own', async () => {
  const c = clock();
  let n = 0;
  const storage = memStorage();
  const src = createOrbitSource({ snapshot: SNAPSHOT, catalog: MISSIONS, storage, now: c.now, fetchFn: async () => (n++, Promise.reject(new Error('offline'))) });
  assert.equal((await src.refresh()).outcome, 'error');
  assert.equal(n, 1);
  assert.equal(src.current().source, 'snapshot');
  assert.equal(src.status().state, 'error');
  assert.equal(Number(storage.getItem('alisio.orbit.lastAttempt')), T0.getTime());
  assert.equal((await src.refresh()).outcome, 'gated');
  assert.equal(n, 1);
});

test('parse error keeps data', async () => {
  const bad = { ok: true, status: 200, json: async () => { throw new SyntaxError('x'); } };
  const { src } = setup({ responses: [bad] });
  assert.equal((await src.refresh()).outcome, 'error');
  assert.equal(src.current().source, 'snapshot');
});

test('13-object response applies exactly the 11 catalog missions', async () => {
  const extra = [
    { ...SNAPSHOT.records[0], NORAD_CAT_ID: 39634, OBJECT_NAME: 'SENTINEL-1A', EPOCH: '2026-10-15T10:00:00' },
    { ...SNAPSHOT.records[0], NORAD_CAT_ID: 41456, OBJECT_NAME: 'SENTINEL-1B', EPOCH: '2026-10-15T10:00:00' },
  ];
  const { src } = setup({ responses: [okResponse([...liveRecords(), ...extra])] });
  const r = await src.refresh();
  assert.equal(r.applied, 11);
  const norads = src.current().records.map((x) => x.NORAD_CAT_ID).sort();
  assert.deepEqual(norads, MISSIONS.map((m) => m.norad).sort());
});

test('a response lacking S5P retains the S5P snapshot record', async () => {
  const s5p = MISSIONS.find((m) => m.id === 'S5P').norad;
  const { src } = setup({ responses: [okResponse(liveRecords().filter((r) => r.NORAD_CAT_ID !== s5p))] });
  const r = await src.refresh();
  assert.equal(r.applied, 10);
  const kept = src.current().records.find((x) => x.NORAD_CAT_ID === s5p);
  assert.equal(kept.EPOCH, SNAPSHOT.records.find((x) => x.NORAD_CAT_ID === s5p).EPOCH);
});

test('newest epoch per NORAD wins; an older duplicate is ignored', async () => {
  const base = liveRecords();
  const older = { ...base[0], EPOCH: '2026-10-15T01:00:00' };
  const { src } = setup({ responses: [okResponse([older, ...base])] });
  await src.refresh();
  assert.equal(src.current().records.find((x) => x.NORAD_CAT_ID === base[0].NORAD_CAT_ID).EPOCH, base[0].EPOCH);
});

test('a record with satrec.error !== 0 is dropped and the previous record is kept', async () => {
  const base = liveRecords();
  const broken = { ...base[0], ECCENTRICITY: 5 };
  const { src } = setup({ responses: [okResponse([broken, ...base.slice(1)])] });
  const r = await src.refresh();
  assert.equal(r.applied, 10);
  assert.equal(src.current().records.find((x) => x.NORAD_CAT_ID === base[0].NORAD_CAT_ID).EPOCH, SNAPSHOT.records[0].EPOCH);
});

test('remote strings are never exposed: names come from the catalog', async () => {
  const base = liveRecords();
  base[0] = { ...base[0], OBJECT_NAME: '<img src=x onerror=alert(1)>', OBJECT_ID: '<script>' };
  const { src } = setup({ responses: [okResponse(base)] });
  await src.refresh();
  const rec = src.current().records.find((x) => x.NORAD_CAT_ID === base[0].NORAD_CAT_ID);
  assert.equal(rec.OBJECT_NAME, MISSIONS.find((m) => m.norad === rec.NORAD_CAT_ID).name);
  assert.ok(!JSON.stringify(src.current().records).includes('<'));
});
