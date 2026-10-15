// KPI derivations (R7.2): pure functions of a pass list and the simulation time. No DOM.
import { missionByNorad } from '../data/missions.mjs';
import { deadlines, timelinessStatus } from './timeliness.mjs';

const DAY_MS = 86_400_000;

/**
 * Simulation assumption (illustrative): the NRT product is complete when the pipeline reaches the archive
 * stage, which is the NRT goal time after LOS. Before that it is still in flight (null).
 */
export function defaultNrtDone(pass, mission, nowMs) {
  const goal = deadlines(pass, mission).goal;
  return nowMs >= goal ? goal : null;
}

/**
 * @param {Array<{id:string,norad:number,aos:number,los:number}>} passes served and upcoming passes
 * @param {number} nowMs simulation time
 * @param {{missionOf?: Function, nrtDoneOf?: (pass, mission, nowMs) => number|null}} [opts]
 * @returns {{passesToday:number, nextAosMs:number|null, countdownMs:number|null, activeCount:number,
 *   volumeGb:number, timeliness:{finished:number,onTime:number,atRisk:number,late:number}}}
 *   `passesToday` counts AOS within the UTC day of `nowMs`; `volumeGb` and the timeliness summary cover passes
 *   that ended within the last 24 h (illustrative rates from the mission catalog).
 */
export function kpis(passes, nowMs, { missionOf = missionByNorad, nrtDoneOf = defaultNrtDone } = {}) {
  const dayStart = Math.floor(nowMs / DAY_MS) * DAY_MS;
  let passesToday = 0, activeCount = 0, volumeGb = 0, nextAosMs = null;
  const timeliness = { finished: 0, onTime: 0, atRisk: 0, late: 0 };
  for (const pass of passes) {
    if (pass.aos >= dayStart && pass.aos < dayStart + DAY_MS) passesToday += 1;
    if (pass.aos <= nowMs && nowMs < pass.los) activeCount += 1;
    if (pass.aos > nowMs && (nextAosMs == null || pass.aos < nextAosMs)) nextAosMs = pass.aos;
    if (pass.los <= nowMs && pass.los > nowMs - DAY_MS) {
      const mission = missionOf(pass.norad);
      if (!mission) continue;
      volumeGb += (mission.downlink.rateMbps * ((pass.los - pass.aos) / 1000)) / 8 / 1000; // Mb -> MB -> GB
      const { status } = timelinessStatus({ pass, mission, nowMs, nrtDoneMs: nrtDoneOf(pass, mission, nowMs) });
      timeliness.finished += 1;
      if (status === 'on-time') timeliness.onTime += 1;
      else if (status === 'at-risk') timeliness.atRisk += 1;
      else if (status === 'late') timeliness.late += 1;
    }
  }
  return { passesToday, nextAosMs, countdownMs: nextAosMs == null ? null : nextAosMs - nowMs, activeCount, volumeGb, timeliness };
}
