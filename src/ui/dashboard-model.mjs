// Pure view models for the dashboard header and KPI panel (R3.2, R7.2, R7.6). No DOM.
import { epochState, epochAgeDays } from '../core/orbit-source.mjs';

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
