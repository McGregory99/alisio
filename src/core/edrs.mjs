// EDRS relay directions (R8.3). The relays are geostationary, so their direction from the station is fixed:
// derived here from each relay's longitude with the same look-angle function as the passes. Which relays exist
// comes from the station's `links` data (kind 'edrs'); they are historical, optional and unverified.
import { lookAngles } from './geo.mjs';

export const GEO_RADIUS_KM = 42164.17;
export const EDRS_NOTE = 'EDRS relays are shown as historical and optional; their current status is unverified and no link is claimed.';

// Orbital slots of the two relay payloads, keyed by the link id used in station data.
const SLOT_LON_DEG = Object.freeze({ 'LNK-EDRS-A': 9, 'LNK-EDRS-C': 31 });

const geoEcf = (lonDeg) => {
  const lon = (lonDeg * Math.PI) / 180;
  return { x: GEO_RADIUS_KM * Math.cos(lon), y: GEO_RADIUS_KM * Math.sin(lon), z: 0 };
};

/** @returns {Array<{id, label, lonDeg, azDeg, elDeg, rangeKm, historical, optional, provenance}>} */
export function edrsRelays(station) {
  return (station.links ?? [])
    .filter((l) => l.kind === 'edrs' && SLOT_LON_DEG[l.id] != null)
    .map((l) => {
      const lonDeg = SLOT_LON_DEG[l.id];
      const la = lookAngles(station.location, geoEcf(lonDeg));
      return { id: l.id, label: l.label, lonDeg, azDeg: la.azDeg, elDeg: la.elDeg, rangeKm: la.rangeKm,
        historical: l.historical === true, optional: l.optional === true, provenance: l.provenance };
    });
}
