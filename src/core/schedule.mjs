// Live schedule: composes orbit records, the pass cache, antenna assignment and the pass lifecycle into one
// per-frame state that the scene and UI read. No DOM and no Three.js. Time is simulation time (epoch ms).
import { toSatrec } from './sgp4.mjs';
import { findPasses } from './passes.mjs';
import { geoLookAngles } from './geo.mjs';
import { createPassCache } from './pass-cache.mjs';
import { assignAntennas } from './scheduler.mjs';
import { phaseAt } from './lifecycle.mjs';
import { MISSIONS, missionByNorad } from '../data/missions.mjs';

/** Finished passes stay visible for the whole pipeline (R2.8 archive deadline is 24 h after LOS). */
export const PIPELINE_MS = 24 * 3_600_000;
const ACTIVE = new Set(['pre-position', 'downlink', 'los']);

/**
 * @param {{station: object, getRecords: () => object[], catalog?: object[], isAvailable?: Function}} opts
 *   `getRecords` returns raw OMM objects (for example `orbitSource.current().records`).
 */
export function createSchedule({ station, getRecords, catalog = MISSIONS, isAvailable }) {
  const observer = station.location;
  const sats = new Map(); // norad -> { key, sat }
  const previous = {};
  const cache = createPassCache({
    scan: (r, startMs, endMs) => findPasses({ sat: r.sat, observer, startMs, endMs, maskDeg: station.maskDeg }),
    keyOf: (r) => r.epoch,
  });
  const known = new Set(catalog.map((m) => m.norad));

  function records() {
    const out = [];
    for (const omm of getRecords()) {
      const norad = omm.NORAD_CAT_ID;
      if (!known.has(norad)) continue;
      let e = sats.get(norad);
      if (!e || e.key !== omm.EPOCH) { e = { key: omm.EPOCH, sat: toSatrec(omm) }; sats.set(norad, e); }
      if (!e.sat.failed) out.push({ norad, epoch: omm.EPOCH, sat: e.sat });
    }
    return out;
  }

  return {
    update(nowMs) {
      const recs = records();
      cache.ensure(recs, nowMs);
      const assignments = assignAntennas({ passes: cache.passes(nowMs), station, nowMs, previous, isAvailable });
      for (const a of assignments) if (a.antennaId) previous[a.pass.id] = a.antennaId;

      const lanes = new Map();
      const running = new Map(); // norad -> antennaId
      for (const a of assignments) {
        if (!a.antennaId) continue;
        const phase = phaseAt(a.pass, nowMs);
        if (!ACTIVE.has(phase)) continue;
        const lane = { pass: a.pass, mission: missionByNorad(a.pass.norad), sat: sats.get(a.pass.norad).sat, phase };
        if (!lanes.has(a.antennaId)) lanes.set(a.antennaId, lane);
        if (!running.has(a.pass.norad)) running.set(a.pass.norad, a.antennaId);
      }

      const date = new Date(nowMs);
      const satellites = recs.map((r) => {
        const la = geoLookAngles(observer, r.sat, date);
        return {
          norad: r.norad, mission: missionByNorad(r.norad), sat: r.sat,
          azDeg: la?.azDeg ?? null, elDeg: la?.elDeg ?? null, rangeKm: la?.rangeKm ?? null,
          antennaId: running.get(r.norad) ?? null,
        };
      });

      const finished = cache.passes(nowMs - PIPELINE_MS)
        .filter((p) => p.los < nowMs && previous[p.id])
        .map((p) => ({ pass: p, mission: missionByNorad(p.norad), antennaId: previous[p.id] }));

      return { assignments, lanes, satellites, finished };
    },
  };
}
