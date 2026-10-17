// Antenna utilisation from the schedule: busy share of a window centred on "now". Pure, no DOM.
/**
 * @param {Array<{pass:{id:string,aos:number,los:number}, antennaId:string|null}>} entries served and finished passes
 * @returns {Array<{id:string, share:number}>} one row per antenna id, `share` in 0..1
 */
export function antennaUtilisation(entries, antennaIds, nowMs, { windowMs = 24 * 3_600_000 } = {}) {
  const from = nowMs - windowMs / 2, to = nowMs + windowMs / 2;
  const seen = new Set();
  const busy = new Map(antennaIds.map((id) => [id, 0]));
  for (const { pass, antennaId } of entries) {
    if (!antennaId || !busy.has(antennaId) || seen.has(pass.id)) continue;
    seen.add(pass.id);
    busy.set(antennaId, busy.get(antennaId) + Math.max(0, Math.min(pass.los, to) - Math.max(pass.aos, from)));
  }
  return antennaIds.map((id) => ({ id, share: busy.get(id) / windowMs }));
}
