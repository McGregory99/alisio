// Pure view models for the dashboard header and KPI panel (R3.2, R7.2, R7.6). No DOM.
import { epochState, epochAgeDays } from '../core/orbit-source.mjs';
import { kpis } from '../core/kpi.mjs';
import { missionByNorad } from '../data/missions.mjs';
import { bucketCounts, rangeSeries } from './spark-model.mjs';

export function formatCountdown(ms) {
  if (ms == null) return '--';
  const s = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const mm = String(m).padStart(2, '0'), ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

const utcMinute = (d) => `${new Date(d).toISOString().slice(0, 16).replace('T', ' ')} UTC`;
const utcClock = (d) => `${new Date(d).toISOString().slice(11, 16)} UTC`;
const parse = (epoch) => new Date(/(Z|[+-]\d\d:?\d\d)$/.test(epoch) ? epoch : `${epoch}Z`);

/**
 * Header state: source label, newest epoch, its age at `simNow`, a state/warning from the oldest record,
 * and the refresh control (enabled flag plus the text that says when it is next allowed, R3.4).
 * @param {{source:string, records:Array<{EPOCH:string}>}} data orbitSource.current()
 * @param {{state:string, nextAllowedAt:Date|null}} status orbitSource.status()
 * @param {Date} simNow time the epoch age refers to
 * @param {Date} realNow wall clock, which the refresh gate uses
 */
export function sourceModel(data, status, simNow, realNow) {
  const epochs = data.records.map((r) => r.EPOCH);
  const newest = epochs.reduce((a, b) => (parse(a) > parse(b) ? a : b));
  const oldest = epochs.reduce((a, b) => (parse(a) < parse(b) ? a : b));
  const worst = epochState(oldest, simNow);
  const gated = status.nextAllowedAt && realNow < status.nextAllowedAt;
  let refresh;
  if (status.state === 'blocked') refresh = { enabled: false, text: 'Live refresh blocked for this session.' };
  else if (gated) refresh = { enabled: false, text: `Next refresh allowed after ${utcClock(status.nextAllowedAt)}.` };
  else refresh = { enabled: true, text: 'Live refresh available (one request, on demand).' };
  return {
    label: data.source === 'live' ? 'Live' : 'Snapshot',
    epoch: utcMinute(parse(newest)),
    ageDays: Math.round(epochAgeDays(newest, simNow) * 100) / 100,
    state: worst.state,
    warning: worst.warning,
    refresh,
  };
}

/** One line for the outcome of a refresh attempt. */
export function refreshOutcomeText(result) {
  if (!result) return '';
  switch (result.outcome) {
    case 'ok': return `Live data applied for ${result.applied} missions.`;
    case 'gated': return `Not requested: next refresh allowed after ${utcClock(result.nextAllowedAt)}.`;
    case 'blocked': return `Source refused the request${result.status ? ` (HTTP ${result.status})` : ''}; no further attempts this session. Current data kept.`;
    default: return 'Refresh failed; current data kept, no automatic retry.';
  }
}

/** Display rows of the KPI panel from the pure `kpis()` result. */
export function kpiRows(k) {
  const t = k.timeliness;
  return [
    { id: 'today', label: 'Passes today (UTC)', value: String(k.passesToday), sub: 'served passes' },
    { id: 'countdown', label: 'Next AOS in', value: formatCountdown(k.countdownMs), sub: k.nextAosMs == null ? 'no pass in the schedule' : utcClock(k.nextAosMs) },
    { id: 'active', label: 'Active passes', value: String(k.activeCount), sub: 'between AOS and LOS' },
    { id: 'volume', label: 'Data, last 24 h', value: `${Math.round(k.volumeGb)} GB`, sub: 'illustrative rates' },
    {
      id: 'timeliness', label: 'Timeliness (NRT)',
      value: t.finished === 0 ? 'none finished' : `${t.onTime} on time, ${t.atRisk} at risk, ${t.late} late`,
      sub: t.finished === 0 ? '' : `of ${t.finished} finished (illustrative targets except S1)`,
    },
  ];
}

const HOUR_MS = 3_600_000, DAY_MS = 86_400_000, NEXT_WINDOW_MS = 90 * 60_000;
const passGb = (p) => { const m = missionByNorad(p.norad); return m ? (m.downlink.rateMbps * ((p.los - p.aos) / 1000)) / 8 / 1000 : 0; };

/**
 * KPI cards with numeric values, a sparkline series and an honest delta, derived only from the served passes.
 * today: passes per 2 h of the UTC day; active: concurrent passes over -12 h..+12 h; volume: GB per hour (by LOS) over 24 h.
 */
export function kpiCards(passes, nowMs) {
  const k = kpis(passes, nowMs);
  const dayStart = Math.floor(nowMs / DAY_MS) * DAY_MS;
  const t = k.timeliness;
  const nextPass = k.nextAosMs == null ? null : passes.find((p) => p.aos === k.nextAosMs);
  const nextName = nextPass ? missionByNorad(nextPass.norad)?.name : null;

  const volumeSpark = new Array(24).fill(0);
  let lastHourGb = 0;
  for (const p of passes) {
    if (p.los > nowMs || p.los <= nowMs - DAY_MS) continue;
    const gb = passGb(p);
    volumeSpark[Math.min(23, Math.floor((p.los - (nowMs - DAY_MS)) / HOUR_MS))] += gb;
    if (p.los > nowMs - HOUR_MS) lastHourGb += gb;
  }
  const volumeDelta = t.finished === 0
    ? { text: 'no finished passes in 24 h', tone: 'flat' }
    : { text: `+${Math.round(lastHourGb)} GB last hour`, tone: lastHourGb > 0 ? 'up' : 'flat' };

  return [
    {
      id: 'today', label: 'Passes today (UTC)', num: k.passesToday, unit: '', sub: 'served passes, per 2 h',
      spark: bucketCounts(passes.map((p) => p.aos), dayStart, dayStart + DAY_MS, 12), markAt: (nowMs - dayStart) / DAY_MS,
    },
    {
      id: 'countdown', label: 'Next AOS in', text: formatCountdown(k.countdownMs), countdownMs: k.countdownMs,
      sub: k.nextAosMs == null ? 'no pass in the schedule' : `${utcClock(k.nextAosMs)}${nextName ? ` - ${nextName}` : ''}`,
      progress: k.countdownMs == null ? 0 : Math.min(1, Math.max(0, 1 - k.countdownMs / NEXT_WINDOW_MS)),
    },
    {
      id: 'active', label: 'Active passes', num: k.activeCount, unit: '', sub: 'AOS to LOS, trend +-12 h',
      spark: rangeSeries((tm) => kpis(passes, tm).activeCount, nowMs - 12 * HOUR_MS, nowMs + 12 * HOUR_MS, 24), markAt: 0.5,
    },
    {
      id: 'volume', label: 'Data, last 24 h', num: Math.round(k.volumeGb), unit: 'GB', sub: 'illustrative rates',
      spark: volumeSpark, delta: volumeDelta, markAt: 1,
    },
    {
      id: 'timeliness', label: 'Timeliness (NRT)', finished: t.finished, onTime: t.onTime, atRisk: t.atRisk, late: t.late,
      sub: t.finished === 0 ? 'none finished yet' : 'targets illustrative except S1',
    },
  ];
}

const CHIPS = [['countdown', 'Next AOS'], ['active', 'Active'], ['today', 'Today']];

/** The three slim KPI chips shown under the top bar, from the `kpiCards()` result. */
export function kpiChips(cards) {
  const byId = new Map(cards.map((c) => [c.id, c]));
  return CHIPS.map(([id, label]) => {
    const c = byId.get(id);
    return { id, label, value: c?.text ?? (c?.num != null ? String(c.num) : '--') };
  });
}
