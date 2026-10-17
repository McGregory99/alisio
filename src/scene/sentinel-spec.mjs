// Pure description of the five Sentinel families (metres). Frame: x cross-track, y up (nadir is -y), z along-track.
// Values come from public mission pages (docs/sentinel-models.md); entries marked `approx` are estimates drawn from
// photographs and drawings, not published figures. The model builder reads only this table.
const EO = 'https://www.eoportal.org/satellite-missions/';
const WIKI = 'https://en.wikipedia.org/wiki/';

const spec = (s) => {
  const wingSpan = s.wings ? s.panels * s.panel.len + (s.boom ?? 0) : 0;
  const cross = s.wings === 2 ? s.bus.x + 2 * wingSpan : s.bus.x + wingSpan;
  const maxExtent = Math.max(s.bus.z, cross, s.sar?.length ?? 0, s.bus.y);
  return Object.freeze({ ...s, wingSpan, maxExtent });
};

export const SENTINEL_SPECS = Object.freeze({
  S1: spec({
    family: 'S1', label: 'Sentinel-1 (C-band SAR)',
    bus: { x: 1.3, y: 1.3, z: 3.4 },
    wings: 2, panels: 5, panel: { len: 2.0, width: 1.6 },
    sar: { length: 12.3, height: 0.84, panels: 5 },
    antennas: ['x-band-dish'],
    approx: ['panel size', 'wing length (source says 10 m per wing; modelled as 5 panels of 2 m)', 'SAR mounting angle'],
    sources: [EO + 'copernicus-sentinel-1'],
  }),
  S2: spec({
    family: 'S2', label: 'Sentinel-2 (MSI)',
    bus: { x: 1.8, y: 2.35, z: 3.4 },
    wings: 1, panels: 3, panel: { len: 1.6, width: 1.5 }, boom: 0.4,
    msi: { x: 0.93, y: 0.62, z: 1.47 },
    antennas: ['x-band-dish'],
    approx: ['bus size (public figure 3.4 x 1.8 x 2.35 m)', 'panel size from 7.1 m2 total', 'X-band antenna size'],
    sources: [EO + 'copernicus-sentinel-2', WIKI + 'Sentinel-2'],
  }),
  S3: spec({
    family: 'S3', label: 'Sentinel-3 (OLCI, SLSTR, SRAL)',
    bus: { x: 2.2, y: 2.21, z: 3.9 },
    wings: 1, panels: 3, panel: { len: 1.5, width: 2.3 }, boom: 0.3,
    olciCameras: 5,
    altimeter: { nadir: true, diameter: 1.2 },
    antennas: ['x-band-dish', 'sral', 'mwr'],
    approx: ['SRAL and MWR dish sizes', 'panel size from 10.5 m2 total', 'instrument placement on the nadir face'],
    sources: [EO + 'copernicus-sentinel-3', WIKI + 'Sentinel-3'],
  }),
  S5P: spec({
    family: 'S5P', label: 'Sentinel-5P (TROPOMI)',
    bus: { x: 1.9, y: 1.9, z: 3.35 },
    wings: 1, panels: 3, panel: { len: 1.25, width: 2.1 }, boom: 0.2,
    tropomi: { x: 0.9, z: 1.5 },
    antennas: ['x-band-dish'],
    approx: ['hexagonal bus drawn as a box', 'panel size', 'TROPOMI aperture size'],
    sources: [WIKI + 'Sentinel-5_Precursor', EO + 'copernicus-sentinel-5p'],
  }),
  S6: spec({
    family: 'S6', label: 'Sentinel-6 / Jason-CS (Poseidon-4)',
    bus: { x: 2.34, y: 2.34, z: 4.17 },
    wings: 2, panels: 2, panel: { len: 2.4, width: 2.2 }, boom: 0.3,
    altimeter: { nadir: true, diameter: 1.5 },
    antennas: ['x-band-dish', 'poseidon-4', 'amr-c'],
    approx: ['wing panel count and size (published span not found)', 'altimeter dish diameter', 'AMR-C placement'],
    sources: [WIKI + 'Sentinel-6', EO + 'copernicus-sentinel-6'],
  }),
});

export const FAMILIES = Object.freeze(Object.keys(SENTINEL_SPECS));

/** Spec for a family key ("S1") or a catalog mission id ("S1C", "S6B", "S5P"); null when unknown. */
export function specFor(id) {
  if (typeof id !== 'string') return null;
  if (SENTINEL_SPECS[id]) return SENTINEL_SPECS[id];
  const m = /^S([1236])[A-D]$/.exec(id);
  return m ? SENTINEL_SPECS['S' + m[1]] : null;
}

/** Scene units per metre: sky positions are directions on a compressed sphere, so shown size is compressed
 *  (`16 + 2.2 * extent` units) instead of true scale, which keeps big spacecraft bigger without hiding small ones. */
export const displayScale = (s) => (16 + 2.2 * s.maxExtent) / s.maxExtent;
