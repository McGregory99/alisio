// Campus assets built only from station entities (data-driven). Parametrised dish with az/el groups
// (Downlink technique), radome, power plant, operations building, emissive windows and night lights.
// Roads, fence, cable trenches and service traffic come from roads.mjs / traffic.mjs; every decorative element is an
// illustrative placeholder, grouped under objects that carry `userData.provenance = 'illustrative'`.
import { entitiesFromStation } from '../core/station-entities.mjs';
import { dimsForAntenna } from './station-assets-math.mjs';
import { terrainHeight } from './terrain-math.mjs';
import { envFromSun } from './env-math.mjs';
import { registerAnchor } from './callouts-registry.mjs';
import { createBuildingKit } from './buildings.mjs';
import { createRoads } from './roads.mjs';
import { createTraffic } from './traffic.mjs';
import { dishContent } from './callouts-math.mjs';

export function createStationAssets({ THREE, scene, station }) {
  const kit = createBuildingKit({ THREE });
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, flatShading: true, ...o });
  const { white, grey, steel, accent } = kit.mat;
  const dishMat = mat('#F2F0EB', { roughness: 0.5, side: THREE.DoubleSide });
  const windowMat = new THREE.MeshStandardMaterial({ color: '#1c2a3a', roughness: 0.25, metalness: 0.3, emissive: '#ffcf8a', emissiveIntensity: 0 });
  const { mesh, box, cyl } = kit;
  const lights = [];
  const dishes = new Map();
  const pickables = [];

  function makeDish(e) {
    const d = dimsForAntenna(e.diameterM), s = d.s, R = d.bowlR, f = R * 0.7;
    const root = new THREE.Group();
    const ped = cyl(1.3 * s, 1.9 * s, d.pedestalH, white, 14); ped.position.y = 0.6 + d.pedestalH / 2; root.add(ped);
    const band = cyl(1.38 * s, 1.44 * s, 0.45 * s, accent, 14); band.position.y = 0.6 + d.pedestalH * 0.82; root.add(band);
    const door = kit.plain(0.9 * s, 1.7 * s, 0.25, kit.mat.dark); door.position.set(0, 0.6 + 0.85 * s, 1.82 * s); root.add(door);
    const azG = new THREE.Group(); azG.position.y = 0.6 + d.pedestalH; root.add(azG);
    const head = box(3.6 * s, 1.4 * s, 2.8 * s, grey, 0.3 * s); head.position.y = 0.7 * s; azG.add(head);
    for (const sd of [-1, 1]) { const arm = box(0.65 * s, d.armH, 1.5 * s, grey, 0.2 * s); arm.position.set(sd * 1.75 * s, d.armH / 2 + 0.6 * s, 0); azG.add(arm); }
    const elG = new THREE.Group(); elG.position.y = d.armH + 0.4 * s; azG.add(elG);
    const prof = []; for (let i = 0; i <= 12; i++) { const r = R * i / 12; prof.push(new THREE.Vector2(r, r * r / (4 * f))); }
    const bg = new THREE.LatheGeometry(prof, 36); bg.rotateX(Math.PI / 2);
    const bowl = mesh(bg, dishMat); bowl.position.z = 1.4 * s; elG.add(bowl);
    const rim = mesh(new THREE.TorusGeometry(R, 0.13 * s, 6, 44), grey); rim.position.z = 1.4 * s + R * R / (4 * f); elG.add(rim);
    const hub = cyl(1.3 * s, 1.6 * s, 1.4 * s, grey, 14); hub.rotation.x = Math.PI / 2; hub.position.z = 0.6 * s; elG.add(hub);
    const hubBand = cyl(1.34 * s, 1.34 * s, 0.35 * s, accent, 14); hubBand.rotation.x = Math.PI / 2; hubBand.position.z = 0.2 * s; elG.add(hubBand);
    const focus = new THREE.Vector3(0, 0, 1.4 * s + f);
    for (let i = 0; i < 4; i++) { // feed struts
      const a = i * Math.PI / 2 + Math.PI / 4, rr = R * 0.86;
      const p = new THREE.Vector3(Math.cos(a) * rr, Math.sin(a) * rr, 1.4 * s + rr * rr / (4 * f));
      const strut = cyl(0.07 * s + 0.03, 0.07 * s + 0.03, p.distanceTo(focus), steel, 5);
      strut.position.copy(p).lerp(focus, 0.5); strut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), focus.clone().sub(p).normalize()); elG.add(strut);
    }
    const feed = cyl(0.32 * s, 0.55 * s, 1.2 * s, white, 10); feed.rotation.x = Math.PI / 2; feed.position.copy(focus); elG.add(feed);
    elG.rotation.x = -Math.PI / 2; // stowed pointing at zenith; slice 6b drives az/el
    return { root, azG, elG, pivotH: d.pivotH, feedM: 1.4 * s + f };
  }

  function place(obj, e, yOff = 0) {
    const { x, z } = e.position;
    obj.position.set(x, terrainHeight(x, z) + yOff, z);
    obj.userData.entityId = e.id;
    scene.add(obj);
    pickables.push(obj);
  }
  function addLight(x, y, z, color, power) {
    const l = new THREE.PointLight(color, 0, 55, 1.6); l.position.set(x, y, z); l.userData.power = power;
    scene.add(l); lights.push(l);
  }

  const entities = entitiesFromStation(station);
  for (const e of entities) {
    const g = new THREE.Group();
    if (e.kind === 'facility') {
      registerAnchor(scene, {
        id: e.id, maxDist: 520,
        point: () => ({ x: e.position.x, y: terrainHeight(e.position.x, e.position.z) + 17, z: e.position.z }),
        content: () => ({ title: e.label, tone: 'facility', provenance: e.provenance, entityId: e.id, priority: 30 }),
      });
    }
    if (e.kind === 'antenna') {
      const m = makeDish(e); g.add(m.root);
      const pad = cyl(e.diameterM * 0.7, e.diameterM * 0.75, 0.6, kit.mat.pad, 24); pad.position.y = 0.3; g.add(pad);
      kit.shelter(g, e.diameterM * 0.7 + 3, 3);
      place(g, e);
      dishes.set(e.id, { ...m, entity: e, group: g });
      const top = terrainHeight(e.position.x, e.position.z) + m.pivotH + e.diameterM / 2 + 3;
      registerAnchor(scene, {
        id: e.id, maxDist: 1500,
        point: () => ({ x: e.position.x, y: top, z: e.position.z }),
        content: (frame) => ({ ...dishContent(e.id, frame?.schedule?.lanes?.get(e.id) ?? null), provenance: e.provenance, entityId: e.id }),
      });
      addLight(e.position.x + 6, terrainHeight(e.position.x, e.position.z) + 6, e.position.z + 6, '#ffe2a8', 14);
    } else if (e.kind === 'facility' && e.facilityKind === 'radome') {
      kit.radome(g);
      place(g, e);
    } else if (e.kind === 'facility' && e.facilityKind === 'power-plant') {
      g.add(kit.power());
      place(g, e);
      addLight(e.position.x, terrainHeight(e.position.x, e.position.z) + 7, e.position.z + 8, '#ffe2a8', 16);
    } else if (e.kind === 'facility') {
      g.add(kit.ops());
      place(g, e);
      addLight(e.position.x, terrainHeight(e.position.x, e.position.z) + 9, e.position.z + 11, '#ffe2a8', 18);
    }
  }
  kit.bakeWindows(scene, windowMat);
  const roads = createRoads({ THREE, scene, entities });
  const traffic = createTraffic({ THREE, scene, entities });

  /** Elevation pivot of an antenna in scene coordinates, or the station origin on the terrain when unknown. */
  function pivotOf(id) {
    const d = dishes.get(id);
    if (!d) return { x: 0, y: terrainHeight(0, 0), z: 0 };
    return { x: d.group.position.x, y: d.group.position.y + d.pivotH, z: d.group.position.z, feedM: d.feedM };
  }

  return {
    entities, dishes, pickables, pivotOf, roads, traffic,
    update({ sun, dt = 0.016 }) {
      const k = envFromSun(sun.elDeg).stationLights;
      windowMat.emissiveIntensity = 1.6 * k;
      roads.setNight(k);
      traffic.setNight(k);
      traffic.update({ dt });
      for (const l of lights) l.intensity = l.userData.power * k;
    },
  };
}
