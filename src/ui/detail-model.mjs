// Pure view model for the satellite detail panel (R7.3, R5.7, R5.8). No DOM.
const MU = 398600.4418; // km^3/s^2
const EARTH_RADIUS_KM = 6378.137;

export const TTC_STATEMENT = 'Payload downlink is X-band. Sentinel TT&C prime is Kiruna (S-band capability at Maspalomas shown, not claimed as prime).';

/** Orbit parameters from an OMM record: inclination, eccentricity, period and mean altitude above the equatorial radius. */
export function orbitParams(omm) {
  const n = (omm.MEAN_MOTION * 2 * Math.PI) / 86_400; // rad/s
  const a = Math.cbrt(MU / (n * n));
  return {
    inclinationDeg: omm.INCLINATION,
    eccentricity: omm.ECCENTRICITY,
    periodMin: 1440 / omm.MEAN_MOTION,
    altitudeKm: a - EARTH_RADIUS_KM,
  };
}

export function formatDoppler(hz) {
  if (hz == null) return '--';
  return `${hz >= 0 ? '+' : '-'}${(Math.abs(hz) / 1000).toFixed(1)} kHz`;
}

const fix = (v, d) => v.toFixed(d);

/**
 * @param {{mission:object, omm:object, state:{azDeg:number|null,elDeg:number|null,rangeKm:number|null,visible:boolean,antennaId:string|null}|undefined, dopplerHz:number|null}} p
 */
export function detailRows({ mission, omm, state, dopplerHz }) {
  const o = orbitParams(omm);
  const live = state && state.azDeg != null;
  return [
    { id: 'mission', label: 'Mission', value: mission.name },
    { id: 'azel', label: 'Az / El', value: live ? `${fix(state.azDeg, 1)}° / ${fix(state.elDeg, 1)}°` : '--' },
    { id: 'range', label: 'Range', value: live ? `${Math.round(state.rangeKm)} km` : '--' },
    {
      id: 'doppler', label: state?.antennaId ? 'Doppler (active pass)' : 'Doppler (in view)',
      value: live && state.visible ? formatDoppler(dopplerHz) : '--',
    },
    { id: 'inclination', label: 'Inclination', value: `${fix(o.inclinationDeg, 2)}°` },
    { id: 'period', label: 'Period', value: `${fix(o.periodMin, 1)} min` },
    { id: 'altitude', label: 'Mean altitude', value: `${Math.round(o.altitudeKm)} km` },
    { id: 'eccentricity', label: 'Eccentricity', value: fix(o.eccentricity, 5) },
  ];
}
