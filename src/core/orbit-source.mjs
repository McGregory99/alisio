// Orbit data source: epoch age, user-triggered gated refresh, filtering and merge.
// DOM-free; network, storage and clock are injected.
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
