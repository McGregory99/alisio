import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatCountdown, sourceModel, refreshOutcomeText, kpiRows } from '../../src/ui/dashboard-model.mjs';

const NOW = new Date('2026-10-15T12:00:00Z');
const data = (epochs, source = 'snapshot') => ({ source, fetchedAt: '2026-10-15T11:29:34Z', records: epochs.map((EPOCH) => ({ EPOCH })) });
const idle = { state: 'idle', nextAllowedAt: null };

test('countdown formats mm:ss under an hour, h:mm:ss above, and a dash when unknown', () => {
  assert.equal(formatCountdown(null), '--');
  assert.equal(formatCountdown(0), '00:00');
  assert.equal(formatCountdown(65_000), '01:05');
  assert.equal(formatCountdown(3_600_000 + 5 * 60_000 + 7_000), '1:05:07');
  assert.equal(formatCountdown(-5), '00:00');
});

test('source label, newest epoch and age come from the records (R3.2, R7.6)', () => {
  const m = sourceModel(data(['2026-10-14T12:00:00', '2026-10-11T12:00:00']), idle, NOW, NOW);
  assert.equal(m.label, 'Snapshot');
  assert.equal(m.epoch, '2026-10-14 12:00 UTC');
  assert.equal(m.ageDays, 1);
  assert.equal(m.state, 'aging'); // oldest record is 4 days old: fresh up to 3 d, aging up to 7 d
});

test('live source label', () => {
  assert.equal(sourceModel(data(['2026-10-15T00:00:00'], 'live'), idle, NOW, NOW).label, 'Live');
});

test('warning appears when any record is older than 7 days', () => {
  const m = sourceModel(data(['2026-10-14T12:00:00', '2026-10-06T12:00:00']), idle, NOW, NOW);
  assert.equal(m.warning, true);
  assert.equal(m.state, 'stale');
  assert.equal(sourceModel(data(['2026-10-14T12:00:00']), idle, NOW, NOW).warning, false);
});

test('refresh is enabled when no attempt gates it', () => {
  const r = sourceModel(data(['2026-10-14T12:00:00']), idle, NOW, NOW).refresh;
  assert.equal(r.enabled, true);
  assert.match(r.text, /available/i);
});

test('refresh states the allowed-after time while gated (R3.4)', () => {
  const status = { state: 'ok', nextAllowedAt: new Date('2026-10-15T13:30:00Z') };
  const r = sourceModel(data(['2026-10-14T12:00:00']), status, NOW, NOW).refresh;
  assert.equal(r.enabled, false);
  assert.match(r.text, /13:30 UTC/);
});

test('refresh is enabled again at the allowed-after time', () => {
  const status = { state: 'ok', nextAllowedAt: new Date('2026-10-15T12:00:00Z') };
  assert.equal(sourceModel(data(['2026-10-14T12:00:00']), status, NOW, NOW).refresh.enabled, true);
});

test('blocked state disables refresh for the session (R3.5)', () => {
  const r = sourceModel(data(['2026-10-14T12:00:00']), { state: 'blocked', nextAllowedAt: null }, NOW, NOW).refresh;
  assert.equal(r.enabled, false);
  assert.match(r.text, /blocked/i);
});

test('refresh outcome messages', () => {
  assert.match(refreshOutcomeText({ outcome: 'ok', applied: 11 }), /11/);
  assert.match(refreshOutcomeText({ outcome: 'gated', nextAllowedAt: new Date('2026-10-15T13:30:00Z') }), /13:30 UTC/);
  assert.match(refreshOutcomeText({ outcome: 'blocked', status: 403 }), /403/);
  assert.match(refreshOutcomeText({ outcome: 'error', error: 'x' }), /kept|unchanged|current/i);
  assert.equal(refreshOutcomeText(null), '');
});

test('kpi rows: labels, values and the illustrative marking of volume', () => {
  const rows = kpiRows({ passesToday: 7, nextAosMs: 1, countdownMs: 125_000, activeCount: 1, volumeGb: 123.4,
    timeliness: { finished: 3, onTime: 2, atRisk: 1, late: 0 } });
  const by = Object.fromEntries(rows.map((r) => [r.id, r]));
  assert.equal(by.today.value, '7');
  assert.equal(by.countdown.value, '02:05');
  assert.equal(by.active.value, '1');
  assert.match(by.volume.value, /123/);
  assert.match(by.volume.sub, /illustrative/i);
  assert.match(by.timeliness.value, /2 on time/);
  assert.match(by.timeliness.value, /1 at risk/);
});

test('kpi rows with nothing yet are safe', () => {
  const rows = kpiRows({ passesToday: 0, nextAosMs: null, countdownMs: null, activeCount: 0, volumeGb: 0,
    timeliness: { finished: 0, onTime: 0, atRisk: 0, late: 0 } });
  assert.equal(rows.find((r) => r.id === 'countdown').value, '--');
  assert.equal(rows.find((r) => r.id === 'timeliness').value, 'none finished');
});

// --- KPI cards with trends ---
import { kpiCards } from '../../src/ui/dashboard-model.mjs';

const H1 = 3_600_000;

test('kpi cards expose numeric values, a sparkline series and honest deltas', () => {
  const now = Date.UTC(2026, 9, 15, 12);
  const dayStart = Date.UTC(2026, 9, 15);
  const passes = [
    { id: 'a', norad: 62261, aos: dayStart + 2 * H1, los: dayStart + 2 * H1 + 600_000 },
    { id: 'b', norad: 62261, aos: now - 30 * 60_000, los: now - 20 * 60_000 }, // finished 20 min ago
    { id: 'c', norad: 42063, aos: now + 90 * 60_000, los: now + 100 * 60_000 },
  ];
  const cards = kpiCards(passes, now);
  const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
  assert.deepEqual(cards.map((c) => c.id), ['today', 'countdown', 'active', 'volume', 'timeliness']);
  assert.equal(byId.today.num, 3);
  assert.equal(byId.today.spark.length, 12);
  assert.equal(byId.today.spark.reduce((a, b) => a + b, 0), 3);
  assert.equal(byId.countdown.text, '1:30:00');
  assert.equal(byId.active.num, 0);
  assert.equal(byId.active.spark.length, 24);
  assert.ok(byId.volume.num > 0);
  assert.equal(byId.volume.spark.length, 24);
  assert.match(byId.volume.delta.text, /^\+\d+ GB last hour$/);
  assert.equal(byId.volume.delta.tone, 'up');
  assert.equal(byId.timeliness.finished, 2); // a and b both ended within 24 h
  assert.deepEqual([byId.timeliness.onTime, byId.timeliness.atRisk, byId.timeliness.late], [2, 0, 0]);
});

test('with nothing finished the volume delta says so instead of inventing a trend', () => {
  const cards = kpiCards([], Date.UTC(2026, 9, 15, 12));
  const volume = cards.find((c) => c.id === 'volume');
  assert.equal(volume.num, 0);
  assert.equal(volume.delta.tone, 'flat');
  assert.equal(volume.delta.text, 'no finished passes in 24 h');
  assert.equal(cards.find((c) => c.id === 'countdown').text, '--');
});

test('sparkline cards say where "now" sits on their x axis', () => {
  const now = Date.UTC(2026, 9, 15, 6);
  const by = Object.fromEntries(kpiCards([], now).map((c) => [c.id, c]));
  assert.equal(by.today.markAt, 0.25);
  assert.equal(by.active.markAt, 0.5);
  assert.equal(by.volume.markAt, 1);
});

test('countdown card names the next mission and fills a progress bar over the last 90 minutes', () => {
  const now = Date.UTC(2026, 9, 15, 12);
  const pass = { id: 'n', norad: 42063, aos: now + 45 * 60_000, los: now + 55 * 60_000 };
  const c = kpiCards([pass], now).find((x) => x.id === 'countdown');
  assert.match(c.sub, /12:45 UTC - Sentinel-2B$/);
  assert.equal(c.progress, 0.5);
  assert.equal(kpiCards([], now).find((x) => x.id === 'countdown').progress, 0);
});
