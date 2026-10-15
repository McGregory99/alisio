// Antenna assignment (design 3c). Greedy by mission priority, then max elevation; each pass takes the first
// free antenna of its family's preference list (station.support) that can receive the mission's payload band.
// Busy window per pass: [AOS - 120 s, LOS + 60 s]. Passes already started keep their previous antenna.
// The availability predicate (wind stow, outage) is injected, so this module has no weather dependency.
import { missionByNorad } from '../data/missions.mjs';

export const BUSY_BEFORE_MS = 120_000;
export const BUSY_AFTER_MS = 60_000;

/** True when the antenna may carry the mission's payload downlink: right band AND a payload role (never TT&C only). */
export function canDownlink(antenna, mission) {
  return Boolean(antenna && mission
    && antenna.roles?.includes('payload-downlink')
    && antenna.bands?.rx?.includes(mission.downlink.band));
}

const window = (p) => [p.aos - BUSY_BEFORE_MS, p.los + BUSY_AFTER_MS];
const overlaps = (a, b) => a[0] < b[1] && b[0] < a[1];

function preference(station, mission) {
  const sup = station.support ?? [];
  const entry = sup.find((s) => s.family === mission.family) ?? sup.find((s) => s.family === '*');
  return entry ? entry.antennas : (station.antennas ?? []).map((a) => a.id);
}

/**
 * @returns {Array<{pass, antennaId: string|null, status: 'assigned'|'unassigned'}>} sorted by AOS
 */
export function assignAntennas({ passes, station, nowMs, previous = {}, isAvailable = () => true, missionOf = missionByNorad }) {
  const antennas = new Map((station.antennas ?? []).map((a) => [a.id, a]));
  const busy = new Map([...antennas.keys()].map((id) => [id, []]));
  const result = new Map();

  const take = (p, antennaId) => { busy.get(antennaId).push(window(p)); result.set(p.id, { pass: p, antennaId, status: 'assigned' }); };

  const locked = passes.filter((p) => p.aos <= nowMs && antennas.has(previous[p.id]));
  for (const p of locked) take(p, previous[p.id]);

  const rest = passes.filter((p) => !result.has(p.id)).sort((a, b) => {
    const pa = missionOf(a.norad)?.priority ?? 99, pb = missionOf(b.norad)?.priority ?? 99;
    return pa - pb || b.maxElDeg - a.maxElDeg || a.aos - b.aos;
  });
  for (const p of rest) {
    const mission = missionOf(p.norad);
    const w = window(p);
    const id = mission && preference(station, mission).find((aid) => {
      const a = antennas.get(aid);
      return a && canDownlink(a, mission) && isAvailable(a, p) && !busy.get(aid).some((x) => overlaps(x, w));
    });
    if (id) take(p, id);
    else result.set(p.id, { pass: p, antennaId: null, status: 'unassigned' });
  }
  return passes.map((p) => result.get(p.id)).sort((a, b) => a.pass.aos - b.pass.aos);
}
