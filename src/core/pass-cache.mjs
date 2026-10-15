// Per-satellite pass cache (ADR 3b). The first SYNC_MS of the horizon is scanned synchronously;
// the rest of now + HORIZON_MS is filled a few chunks per `ensure` call (a per-frame budget).
// The cache of a satellite resets when its record changes. `scan(record, startMs, endMs)` is injected.
export const HORIZON_MS = 24 * 3_600_000;
export const SYNC_MS = 6 * 3_600_000;
const CHUNK_MS = 2 * 3_600_000;

export function createPassCache({ scan, budgetScans = 2, keyOf = (r) => r.epoch ?? r }) {
  const state = new Map(); // norad -> { key, passes: Map(id -> pass), scannedUntil }

  function run(entry, record, from, to) {
    for (const p of scan(record, from, to)) entry.passes.set(p.id, p);
    entry.scannedUntil = to;
  }

  return {
    /** Bring the cache up to date for `nowMs`; extension work is limited to `budgetScans` chunks per call. */
    ensure(records, nowMs) {
      let budget = budgetScans;
      const horizon = nowMs + HORIZON_MS;
      for (const record of records) {
        let entry = state.get(record.norad);
        if (!entry || entry.key !== keyOf(record)) {
          entry = { key: keyOf(record), passes: new Map(), scannedUntil: nowMs };
          state.set(record.norad, entry);
          run(entry, record, nowMs, nowMs + SYNC_MS);
          continue; // the synchronous window is this call's whole cost for a new record
        }
        while (budget > 0 && entry.scannedUntil < horizon) {
          run(entry, record, entry.scannedUntil, Math.min(entry.scannedUntil + CHUNK_MS, horizon));
          budget -= 1;
        }
      }
    },
    scannedUntil: (norad) => state.get(norad)?.scannedUntil ?? null,
    /** All cached passes that have not ended yet, sorted by AOS. */
    passes(nowMs) {
      const out = [];
      for (const e of state.values()) for (const p of e.passes.values()) if (p.los >= nowMs) out.push(p);
      return out.sort((a, b) => a.aos - b.aos);
    },
  };
}
