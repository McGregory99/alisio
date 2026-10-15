// Second station with a different location and one antenna: proves nothing is Maspalomas-specific.
export const fixtureStation = {
  id: 'FIX',
  name: 'Fixture Station',
  provenance: 'illustrative',
  location: { latDeg: 67.8571, lonDeg: 20.9643, altM: 400 },
  maskDeg: 5,
  antennas: [
    {
      id: 'FIX-13',
      diameterM: 13,
      bands: { rx: ['S', 'X'], tx: ['S'] },
      roles: ['payload-downlink', 'ttc'],
      flagship: true,
      slewDegS: 3,
      stowWindKmh: 100,
      layout: { eM: 0, nM: 0 },
      provenance: 'illustrative',
      illustrative: ['layout'],
    },
  ],
  facilities: [],
  links: [],
  support: [{ family: '*', antennas: ['FIX-13'], provenance: 'illustrative' }],
};
