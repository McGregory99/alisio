// Active Copernicus Sentinel mission catalog (11 missions). Sentinel-1A/1B are decommissioned and excluded.
// Provenance: the Sentinel-1 core-station role at Maspalomas is `verified`; every other
// mission-to-station assignment, downlink rate and carrier frequency is `illustrative`.
const X_BAND_HZ = 8.0e9; // illustrative X-band carrier used for Doppler display

const mission = (id, norad, family, name, priority, rateMbps) => ({
  id,
  norad,
  family,
  name,
  priority,
  downlink: { band: 'X', rateMbps, hz: X_BAND_HZ },
  timeliness: family === 'S1' ? { provenance: 'verified' } : { provenance: 'illustrative' },
  provenance: family === 'S1' ? 'verified' : 'illustrative',
});

export const MISSIONS = Object.freeze([
  mission('S1C', 62261, 'S1', 'Sentinel-1C', 1, 520),
  mission('S1D', 66315, 'S1', 'Sentinel-1D', 1, 520),
  mission('S2A', 40697, 'S2', 'Sentinel-2A', 2, 560),
  mission('S2B', 42063, 'S2', 'Sentinel-2B', 2, 560),
  mission('S2C', 60989, 'S2', 'Sentinel-2C', 2, 560),
  mission('S3A', 41335, 'S3', 'Sentinel-3A', 3, 300),
  mission('S3B', 43437, 'S3', 'Sentinel-3B', 3, 300),
  mission('S3C', 100690, 'S3', 'Sentinel-3C', 3, 300),
  mission('S5P', 42969, 'S5P', 'Sentinel-5P', 4, 200),
  mission('S6A', 46984, 'S6', 'Sentinel-6 Michael Freilich', 5, 100),
  mission('S6B', 66514, 'S6', 'Sentinel-6B', 5, 100),
]);

export const missionByNorad = (norad) => MISSIONS.find((m) => m.norad === norad);
