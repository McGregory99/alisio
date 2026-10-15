// Data pipeline stages after LOS (R5.5): L0 at the campus, off-site L1/L2 processing, archive, distribution.
// Site names are generic (never a named centre). Stage boundaries reuse the R2.8 deadlines; the campus-to-off-site
// transfer time (EGRESS_MS) is an illustrative placeholder.
import { deadlines } from './timeliness.mjs';

export const EGRESS_MS = 10 * 60_000;

export const STAGES = Object.freeze([
  { id: 'l0', label: 'L0 (campus)' },
  { id: 'l1l2', label: 'L1/L2 processing (off-site, generic)' },
  { id: 'archive', label: 'Archive (off-site, generic)' },
  { id: 'distribution', label: 'Distribution (generic)' },
]);

const byId = Object.fromEntries(STAGES.map((s) => [s.id, s]));

/** Stage of a finished pass at `tMs`, or null before LOS and after the archive deadline. */
export function pipelineStageAt(pass, mission, tMs) {
  if (tMs < pass.los) return null;
  const d = deadlines(pass, mission);
  const dt = tMs - pass.los;
  let id;
  if (dt < EGRESS_MS) id = 'l0';
  else if (tMs < d.goal) id = 'l1l2';
  else if (tMs < d.nrt) id = 'archive';
  else if (tMs < d.archive) id = 'distribution';
  else return null;
  return { ...byId[id], egress: dt < EGRESS_MS, illustrative: d.illustrative || id === 'l0' };
}
