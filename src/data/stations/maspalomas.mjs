// Maspalomas (Gran Canaria) ground station. Only the facts marked `verified` are claimed as real:
// location, the 15 m flagship, the KSAT 5 m antenna and the existence of a no-break power plant.
// Positions inside the campus, extra dishes and buildings are an artistic placeholder (`illustrative`).
// Look angles are computed from the geodetic origin below (station-origin reference).
// `surroundings` records what the scene's terrain takes from ESA (verified) and what it invents (illustrative).
export const MASPALOMAS = {
  id: 'MSP',
  name: 'Maspalomas',
  provenance: 'verified',
  location: { latDeg: 27.76289, lonDeg: -15.6338, altM: 205 },
  maskDeg: 5,
  surroundings: {
    // ESA (Maspalomas station page): ~1,750 m to the coast, ~1.6 km from the main Las Palmas-Mogan road,
    // elevation 205.1 m above the WGS-84 ellipsoid (used as height above sea level in the scene).
    coastDistanceM: 1750,
    mainRoadDistanceM: 1600,
    site: 'Montana Blanca, San Bartolome de Tirajana, south Gran Canaria',
    provenance: 'verified',
    illustrative: ['terrain shape and slope profile', 'barrancos', 'dune field', 'coastal town patch', 'access road alignment', 'campus layout and fence'],
  },
  antennas: [
    {
      id: 'MSP-15',
      diameterM: 15,
      bands: { rx: ['S', 'X'], tx: ['S'] },
      roles: ['payload-downlink', 'ttc'],
      flagship: true,
      slewDegS: 3,
      stowWindKmh: 90,
      layout: { eM: 0, nM: 0 },
      provenance: 'verified',
      illustrative: ['layout', 'slewDegS', 'stowWindKmh'],
    },
    {
      id: 'MSP-KSAT5',
      diameterM: 5,
      operator: 'KSAT',
      bands: { rx: ['S', 'X'], tx: ['S'] },
      roles: ['payload-downlink'],
      flagship: false,
      slewDegS: 5,
      stowWindKmh: 100,
      layout: { eM: 60, nM: -35 },
      provenance: 'verified',
      illustrative: ['layout', 'bands', 'slewDegS', 'stowWindKmh'],
    },
    {
      id: 'MSP-S9',
      diameterM: 9,
      bands: { rx: ['S'], tx: ['S'] },
      roles: ['ttc'],
      flagship: false,
      slewDegS: 4,
      stowWindKmh: 95,
      layout: { eM: -55, nM: 40 },
      provenance: 'illustrative',
      illustrative: ['all'],
    },
  ],
  facilities: [
    { id: 'MSP-POWER', kind: 'power-plant', name: 'No-break power plant', layout: { eM: 25, nM: 70 }, provenance: 'verified', illustrative: ['layout'] },
    { id: 'MSP-OPS', kind: 'building', name: 'Operations building', layout: { eM: -30, nM: -50 }, provenance: 'illustrative' },
    { id: 'MSP-RADOME', kind: 'radome', name: 'Radome', layout: { eM: 90, nM: 30 }, provenance: 'illustrative' },
  ],
  links: [
    { id: 'LNK-PAC', source: 'MSP', kind: 'processing-site', to: 'processing-archiving-centres', medium: 'fibre', label: 'Processing & Archiving Centres', provenance: 'illustrative' },
    { id: 'LNK-EDRS-A', source: 'MSP', kind: 'edrs', to: 'EDRS-A 9E', medium: 'relay', label: 'EDRS-A (9 E)', historical: true, optional: true, provenance: 'illustrative' },
    { id: 'LNK-EDRS-C', source: 'MSP', kind: 'edrs', to: 'EDRS-C 31E', medium: 'relay', label: 'EDRS-C (31 E)', historical: true, optional: true, provenance: 'illustrative' },
  ],
  support: [
    { family: 'S1', antennas: ['MSP-15', 'MSP-KSAT5'], provenance: 'verified' },
    { family: '*', antennas: ['MSP-15', 'MSP-KSAT5'], provenance: 'illustrative' },
  ],
};
