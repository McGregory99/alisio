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
