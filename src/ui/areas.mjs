// Pure area presets (R6.4), derived from station data. Scene frame: x east, y up, z south-positive.
import { entitiesFromStation } from '../core/station-entities.mjs';
import { COAST_Z } from '../scene/terrain-math.mjs';

/** @returns {Array<{id:string,label:string,target:{x:number,y:number,z:number},dist:number,dirFrom:{x:number,y:number,z:number}}>} */
export function areasFor(station, { heightAt = () => 0 } = {}) {
  const antennas = entitiesFromStation(station).filter((e) => e.kind === 'antenna');
  const flagship = antennas.find((a) => a.flagship) ?? antennas[0];
  const fp = flagship?.position ?? { x: 0, z: 0 };
  return [
    { id: 'campus', label: 'Campus overview', target: { x: 0, y: heightAt(0, 0) + 10, z: 0 }, dist: 330, dirFrom: { x: -160, y: 110, z: 260 } },
    { id: 'flagship', label: 'Flagship dish', target: { x: fp.x, y: heightAt(fp.x, fp.z) + 8, z: fp.z }, dist: 80, dirFrom: { x: -1, y: 0.5, z: 1.2 } },
    { id: 'coast', label: 'Coast / sea', target: { x: 0, y: heightAt(0, COAST_Z) + 5, z: COAST_Z }, dist: 700, dirFrom: { x: 0, y: 0.45, z: -1 } },
    { id: 'orbit', label: 'Orbit view', target: { x: 0, y: 160, z: 0 }, dist: 1100, dirFrom: { x: 0, y: 1, z: 0.9 } },
  ];
}

/** Station list for the switcher: empty unless more than one station exists in data. */
export function stationChoices(stations) {
  return stations.length > 1 ? stations.map((s) => ({ id: s.id, label: s.name })) : [];
}
