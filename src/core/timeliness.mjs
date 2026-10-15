// Timeliness (R2.8, R5.6). Sentinel-1: NRT within 3 h of LOS (goal 1 h), archive within 24 h (verified targets).
// Other missions reuse the same offsets as an illustrative placeholder and are flagged as such.
const H = 3_600_000;
const NRT_MS = 3 * H, GOAL_MS = 1 * H, ARCHIVE_MS = 24 * H;

export function deadlines(pass, mission) {
  return {
    goal: pass.los + GOAL_MS,
    nrt: pass.los + NRT_MS,
    archive: pass.los + ARCHIVE_MS,
    illustrative: mission.family !== 'S1',
  };
}

export function productTimeline(pass, mission) {
  const d = deadlines(pass, mission);
  return [
    { id: 'downlink-complete', at: pass.los, label: 'Downlink complete (LOS)', illustrative: false },
    { id: 'nrt-goal', at: d.goal, label: 'NRT goal (1 h)', illustrative: d.illustrative },
    { id: 'nrt', at: d.nrt, label: 'NRT deadline (3 h)', illustrative: d.illustrative },
    { id: 'archive', at: d.archive, label: 'Archive deadline (24 h)', illustrative: d.illustrative },
  ];
}

/**
 * Status of the NRT product. Not completed: pending before LOS, on-time up to the goal,
 * at-risk up to the NRT deadline, late after. Completed (`nrtDoneMs`): on-time when within the NRT deadline.
 */
export function timelinessStatus({ pass, mission, nowMs, nrtDoneMs = null }) {
  const d = deadlines(pass, mission);
  let status;
  if (nrtDoneMs != null) status = nrtDoneMs <= d.nrt ? 'on-time' : 'late';
  else if (nowMs < pass.los) status = 'pending';
  else if (nowMs <= d.goal) status = 'on-time';
  else if (nowMs <= d.nrt) status = 'at-risk';
  else status = 'late';
  return { status, illustrative: d.illustrative, deadlines: d };
}
