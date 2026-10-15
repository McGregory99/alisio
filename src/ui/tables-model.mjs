// Pure models of the sortable tables (R7.5): passes, antennas and satellites. No DOM.
import { epochState } from '../core/orbit-source.mjs';
import { phaseAt } from '../core/lifecycle.mjs';
import { missionByNorad } from '../data/missions.mjs';

const isMissing = (v) => v == null || (typeof v === 'number' && Number.isNaN(v));

/** Stable sort by `key`; numbers numerically, strings alphabetically; missing values last in both directions. */
export function sortRows(rows, key, dir = 'asc') {
  const sign = dir === 'desc' ? -1 : 1;
  return rows
    .map((row, i) => ({ row, i }))
    .sort((a, b) => {
      const x = a.row[key], y = b.row[key];
      if (isMissing(x) || isMissing(y)) return isMissing(x) === isMissing(y) ? a.i - b.i : isMissing(x) ? 1 : -1;
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'en', { numeric: true });
      return c ? sign * c : a.i - b.i;
    })
    .map((e) => e.row);
}

/** Clicking a header: toggle direction on the same column, start ascending on another. */
export const nextSort = (current, key) => (current.key === key ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });

const utcTime = (ms) => new Date(ms).toISOString().slice(11, 19);

export function passTable(schedule, nowMs) {
  const entries = [...schedule.finished.map((f) => ({ pass: f.pass, antennaId: f.antennaId })), ...schedule.assignments.map((a) => ({ pass: a.pass, antennaId: a.status === 'assigned' ? a.antennaId : null }))];
  const seen = new Set();
  const rows = [];
  for (const { pass, antennaId } of entries) {
    if (seen.has(pass.id)) continue;
    seen.add(pass.id);
    const mission = missionByNorad(pass.norad);
    rows.push({
      id: pass.id, norad: pass.norad, name: mission?.name ?? String(pass.norad), aos: pass.aos, aosUtc: utcTime(pass.aos), losUtc: utcTime(pass.los),
      durationS: Math.round((pass.los - pass.aos) / 1000), maxElDeg: Math.round(pass.maxElDeg),
      antenna: antennaId ?? 'unserved', phase: phaseAt(pass, nowMs) ?? 'scheduled', provenance: mission?.provenance ?? 'illustrative',
    });
  }
  return {
    columns: [
      { key: 'name', label: 'Mission' }, { key: 'aos', label: 'AOS', field: 'aosUtc' },
      { key: 'maxElDeg', label: 'Max el', numeric: true }, { key: 'antenna', label: 'Antenna' }, { key: 'phase', label: 'State' },
    ],
    rows: sortRows(rows, 'aos', 'asc'),
  };
}

export function antennaTable(station) {
  const rows = station.antennas.map((a) => ({
    id: a.id, diameterM: a.diameterM, rx: a.bands.rx.join(', '), tx: a.bands.tx.join(', '),
    roles: a.roles.join(', '), provenance: a.provenance,
  }));
  return {
    columns: [
      { key: 'id', label: 'Antenna' }, { key: 'diameterM', label: 'Dia (m)', numeric: true }, { key: 'rx', label: 'Rx' },
      { key: 'tx', label: 'Tx' }, { key: 'roles', label: 'Roles' }, { key: 'provenance', label: 'Provenance', badge: true },
    ],
    rows,
  };
}

/** @param {{missions:object[], records:object[], nowDate:Date, states:Map}} p `states`: norad -> { elDeg } for the live elevation. */
export function satelliteTable({ missions, records, nowDate, states }) {
  const byNorad = new Map(records.map((r) => [r.NORAD_CAT_ID, r]));
  const rows = missions.map((m) => {
    const rec = byNorad.get(m.norad);
    const e = rec ? epochState(rec.EPOCH, nowDate) : null;
    return {
      norad: m.norad, name: m.name, family: m.family,
      epochAgeDays: e ? Math.round(e.ageDays * 100) / 100 : null, epochState: e?.state ?? '--',
      elDeg: states.get(m.norad)?.elDeg == null ? null : Math.round(states.get(m.norad).elDeg),
      provenance: m.provenance,
    };
  });
  return {
    columns: [
      { key: 'name', label: 'Mission' }, { key: 'norad', label: 'NORAD', numeric: true }, { key: 'epochAgeDays', label: 'Epoch age (d)', numeric: true },
      { key: 'epochState', label: 'Epoch' }, { key: 'elDeg', label: 'El', numeric: true }, { key: 'provenance', label: 'Provenance', badge: true },
    ],
    rows,
  };
}
