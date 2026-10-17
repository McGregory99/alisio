// Pure rows for the pass tracker (R7.4, R5.6): upcoming and current passes with lifecycle state and
// timeliness status, plus the most recent finished passes. No DOM.
import { phaseAt, PREPOSITION_MS, LOS_HOLD_MS } from '../core/lifecycle.mjs';
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

const STEP_DEFS = [
  { id: 'scheduled', label: 'Scheduled', at: () => null },
  { id: 'pre-position', label: 'Pre-position', at: (p) => p.aos - PREPOSITION_MS },
  { id: 'downlink', label: 'Downlink (AOS)', at: (p) => p.aos },
  { id: 'los', label: 'LOS', at: (p) => p.los },
  { id: 'delivered', label: 'Delivered', at: (p) => p.los + LOS_HOLD_MS },
];
const PHASE_INDEX = { 'pre-position': 1, downlink: 2, los: 3, delivered: 4 };
const utcSeconds = (ms) => new Date(ms).toISOString().slice(11, 19);

/**
 * Lifecycle stepper of one pass at `nowMs`: five stages from the pure `phaseAt` (the model has no separate "lock" state),
 * each with its UTC time, the active stage, progress through the downlink (0..1) and the LOS countdown while it runs.
 */
export function passStepper(pass, nowMs) {
  const activeIndex = PHASE_INDEX[phaseAt(pass, nowMs)] ?? 0;
  const steps = STEP_DEFS.map((d, i) => {
    const at = d.at(pass);
    return { id: d.id, label: d.label, at, timeUtc: at == null ? null : utcSeconds(at), active: i === activeIndex, done: i < activeIndex || (i === 4 && activeIndex === 4) };
  });
  const progress = Math.min(1, Math.max(0, (nowMs - pass.aos) / (pass.los - pass.aos)));
  return { steps, activeIndex, progress, losInMs: nowMs >= pass.aos && nowMs < pass.los ? pass.los - nowMs : null };
}

/** The pass the big card shows: the served pass in flight, else the next served one; null when none. */
export function currentPassCard(schedule, nowMs) {
  const served = schedule.assignments.filter((a) => a.status === 'assigned').sort((a, b) => a.pass.aos - b.pass.aos);
  const inFlight = served.find((a) => ['pre-position', 'downlink', 'los'].includes(phaseAt(a.pass, nowMs)));
  const a = inFlight ?? served.find((x) => x.pass.aos > nowMs);
  if (!a) return null;
  const mission = missionByNorad(a.pass.norad);
  return {
    id: a.pass.id, norad: a.pass.norad, name: mission.name, family: mission.family, provenance: mission.provenance,
    antennaId: a.antennaId, band: mission.downlink.band, rateMbps: mission.downlink.rateMbps, maxElDeg: a.pass.maxElDeg,
    aos: a.pass.aos, los: a.pass.los, live: inFlight != null, pass: a.pass,
  };
}
