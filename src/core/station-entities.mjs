// Pure data-to-entity mapping: station data in, renderable entity descriptors out.
// Scene frame: x east, z south-positive (-z north), 1 unit = 1 m on campus, relative to the station origin.
const toScene = (layout = {}) => ({ x: layout.eM ?? 0, z: -(layout.nM ?? 0) });

export function entitiesFromStation(station) {
  const antennas = (station.antennas ?? []).map((a) => ({
    kind: 'antenna',
    id: a.id,
    label: `${a.diameterM} m antenna${a.operator ? ` (${a.operator})` : ''}`,
    position: toScene(a.layout),
    provenance: a.provenance,
    diameterM: a.diameterM,
    flagship: Boolean(a.flagship),
    operator: a.operator ?? null,
    bands: a.bands,
    illustrative: a.illustrative ?? [],
  }));
  const facilities = (station.facilities ?? []).map((f) => ({
    kind: 'facility',
    facilityKind: f.kind,
    id: f.id,
    label: f.name,
    position: toScene(f.layout),
    provenance: f.provenance,
    illustrative: f.illustrative ?? [],
  }));
  // Processing is off-site: only the egress link toward processing sites is drawn from the campus.
  const links = (station.links ?? [])
    .filter((l) => l.kind === 'processing-site')
    .map((l) => ({ kind: 'link', id: l.id, label: l.label, medium: l.medium, offSite: true, provenance: l.provenance }));
  return [...antennas, ...facilities, ...links];
}
