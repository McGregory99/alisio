// Pure rows for the pass tracker (R7.4, R5.6): upcoming and current passes with lifecycle state and
// timeliness status, plus the most recent finished passes. No DOM.
import { phaseAt } from '../core/lifecycle.mjs';
import { timelinessStatus } from '../core/timeliness.mjs';
import { defaultNrtDone } from '../core/kpi.mjs';
import { missionByNorad } from '../data/missions.mjs';

const RECENT_FINISHED = 3;

function row(pass, antennaId, nowMs) {
  const mission = missionByNorad(pass.norad);
  const phase = phaseAt(pass, nowMs) ?? 'scheduled';
  const t = timelinessStatus({ pass, mission, nowMs, nrtDoneMs: nowMs >= pass.los ? defaultNrtDone(pass, mission, nowMs) : null });
  return {
    id: pass.id, norad: pass.norad, name: mission.name, family: mission.family, provenance: mission.provenance,
    aos: pass.aos, aosUtc: new Date(pass.aos).toISOString().slice(11, 16), maxElDeg: pass.maxElDeg,
    phase, antennaId, served: antennaId != null,
    timeliness: { status: t.status, illustrative: t.illustrative },
  };
}

/** @param {{assignments:Array, finished:Array}} schedule from createSchedule().update() */
export function trackerRows(schedule, nowMs, { limit = 8 } = {}) {
  const upcoming = schedule.assignments
    .filter((a) => phaseAt(a.pass, nowMs) !== 'delivered')
    .slice(0, limit)
    .map((a) => row(a.pass, a.status === 'assigned' ? a.antennaId : null, nowMs));
  const done = [...schedule.finished].sort((a, b) => a.pass.aos - b.pass.aos).slice(-RECENT_FINISHED)
    .map((f) => row(f.pass, f.antennaId, nowMs));
  return [...done, ...upcoming].sort((a, b) => a.aos - b.aos);
}
