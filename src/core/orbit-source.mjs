// Orbit data source: epoch age, user-triggered gated refresh, filtering and merge.
// DOM-free; network, storage and clock are injected.
import { toSatrec } from './sgp4.mjs';

export const GROUP_URL = 'https://celestrak.org/NORAD/elements/gp.php?NAME=SENTINEL&FORMAT=JSON';
export const GATE_MS = 2 * 3_600_000;
const GATE_KEY = 'alisio.orbit.lastAttempt';
const DAY_MS = 86_400_000;

/** CelesTrak OMM epochs carry no zone suffix; they are UTC. */
const parseEpoch = (epoch) => new Date(/(Z|[+-]\d\d:?\d\d)$/.test(epoch) ? epoch : `${epoch}Z`);

/** Age in days of an OMM epoch string at `now` (Date). */
export function epochAgeDays(epoch, now) {
  return (now.getTime() - parseEpoch(epoch).getTime()) / DAY_MS;
}

/** fresh <= 3 d, aging <= 7 d, stale beyond; `warning` is true only when stale (> 7 d). */
export function epochState(epoch, now) {
  const ageDays = epochAgeDays(epoch, now);
  const state = ageDays <= 3 ? 'fresh' : ageDays <= 7 ? 'aging' : 'stale';
  return { ageDays, state, warning: ageDays > 7 };
}

/** Age in days of the most recent record epoch. */
export function newestEpochAge(records, now) {
  return Math.min(...records.map((r) => epochAgeDays(r.EPOCH, now)));
}

/**
 * Keep catalog missions only; newest epoch per NORAD wins; invalid satrecs are dropped.
 * Remote strings are never kept: the name comes from the catalog and OBJECT_ID must look like one.
 */
export function filterRecords(records, catalog) {
  const byNorad = new Map(catalog.map((m) => [m.norad, m]));
  const best = new Map();
  for (const r of Array.isArray(records) ? records : []) {
    const mission = byNorad.get(r?.NORAD_CAT_ID);
    if (!mission || toSatrec(r).failed) continue;
    const prev = best.get(r.NORAD_CAT_ID);
    if (!prev || parseEpoch(r.EPOCH) > parseEpoch(prev.EPOCH)) {
      const clean = { ...r, OBJECT_NAME: mission.name };
      if (!/^\d{4}-\d{3}[A-Z]{0,3}$/.test(String(r.OBJECT_ID))) delete clean.OBJECT_ID;
      best.set(r.NORAD_CAT_ID, clean);
    }
  }
  return best;
}

/**
 * Orbit data with a user-triggered, gated live refresh. Nothing is fetched on creation.
 * The gate (2 h from the last attempt) is persisted before the request; storage failures fall
 * back to memory. 403/404 block further attempts for the session; other errors keep the data.
 */
export function createOrbitSource({ snapshot, catalog, fetchFn, storage, now = () => new Date() }) {
  let data = { source: 'snapshot', fetchedAt: snapshot.fetchedAt, records: snapshot.records };
  let lastAttempt = null;
  let state = 'idle';

  try {
    const stored = Number(storage?.getItem(GATE_KEY));
    if (Number.isFinite(stored) && stored > 0) lastAttempt = stored;
  } catch { /* in-memory gate only */ }

  const nextAllowedAt = () => (lastAttempt == null ? null : new Date(lastAttempt + GATE_MS));

  async function refresh() {
    if (state === 'blocked') return { outcome: 'blocked', nextAllowedAt: null };
    const t = now().getTime();
    if (lastAttempt != null && t < lastAttempt + GATE_MS) return { outcome: 'gated', nextAllowedAt: nextAllowedAt() };
    lastAttempt = t;
    try { storage?.setItem(GATE_KEY, String(t)); } catch { /* memory gate */ }
    try {
      const res = await fetchFn(GROUP_URL);
      if (res.status === 403 || res.status === 404) {
        state = 'blocked';
        return { outcome: 'blocked', status: res.status, nextAllowedAt: null };
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const incoming = filterRecords(await res.json(), catalog);
      const merged = new Map(data.records.map((r) => [r.NORAD_CAT_ID, r]));
      for (const [norad, rec] of incoming) merged.set(norad, rec);
      data = { source: 'live', fetchedAt: new Date(t).toISOString(), records: [...merged.values()] };
      state = 'ok';
      return { outcome: 'ok', applied: incoming.size, nextAllowedAt: nextAllowedAt() };
    } catch (e) {
      state = 'error';
      return { outcome: 'error', error: String(e?.message ?? e), nextAllowedAt: nextAllowedAt() };
    }
  }

  return {
    current: () => data,
    status: () => ({ state, nextAllowedAt: nextAllowedAt(), lastAttemptAt: lastAttempt == null ? null : new Date(lastAttempt) }),
    refresh,
  };
}
