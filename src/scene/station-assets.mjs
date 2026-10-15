// Campus assets built only from station entities (data-driven). Parametrised dish with az/el groups
// (Downlink technique), radome, power plant, operations building, emissive windows and night lights.
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { entitiesFromStation } from '../core/station-entities.mjs';
import { dimsForAntenna } from './station-assets-math.mjs';
import { terrainHeight } from './terrain-math.mjs';
import { envFromSun } from './env-math.mjs';

export function createStationAssets({ THREE, scene, station }) {
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, flatShading: true, ...o });
  const white = mat('#E7E4DE'), grey = mat('#DAD6CF'), steel = mat('#8b929b', { metalness: 0.4, roughness: 0.4 });
  const accent = mat('#2f6fbf'), dishMat = mat('#F2F0EB', { roughness: 0.5, side: THREE.DoubleSide });
  const windowMat = mat('#1c2a3a', { emissive: '#ffcf8a', emissiveIntensity: 0 });
  const lampMat = mat('#333', { emissive: '#ffe2a8', emissiveIntensity: 0 });
  const mesh = (g, m) => { const o = new THREE.Mesh(g, m); o.castShadow = o.receiveShadow = true; return o; };
  const box = (w, h, d, m, r = 0.25) => mesh(new RoundedBoxGeometry(w, h, d, 3, r), m);
  const cyl = (rt, rb, h, m, seg = 16) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  const lights = [];
  const dishes = new Map();
  const pickables = [];

  function makeDish(e) {
    const d = dimsForAntenna(e.diameterM), s = d.s, R = d.bowlR, f = R * 0.7;
    const root = new THREE.Group();
    const ped = cyl(1.3 * s, 1.9 * s, d.pedestalH, white, 14); ped.position.y = 0.6 + d.pedestalH / 2; root.add(ped);
    const band = cyl(1.38 * s, 1.44 * s, 0.45 * s, accent, 14); band.position.y = 0.6 + d.pedestalH * 0.82; root.add(band);
    const azG = new THREE.Group(); azG.position.y = 0.6 + d.pedestalH; root.add(azG);
    const head = box(3.6 * s, 1.4 * s, 2.8 * s, grey, 0.3 * s); head.position.y = 0.7 * s; azG.add(head);
    for (const sd of [-1, 1]) { const arm = box(0.65 * s, d.armH, 1.5 * s, grey, 0.2 * s); arm.position.set(sd * 1.75 * s, d.armH / 2 + 0.6 * s, 0); azG.add(arm); }
    const elG = new THREE.Group(); elG.position.y = d.armH + 0.4 * s; azG.add(elG);
    const prof = []; for (let i = 0; i <= 12; i++) { const r = R * i / 12; prof.push(new THREE.Vector2(r, r * r / (4 * f))); }
    const bg = new THREE.LatheGeometry(prof, 36); bg.rotateX(Math.PI / 2);
    const bowl = mesh(bg, dishMat); bowl.position.z = 1.4 * s; elG.add(bowl);
    const rim = mesh(new THREE.TorusGeometry(R, 0.13 * s, 6, 44), grey); rim.position.z = 1.4 * s + R * R / (4 * f); elG.add(rim);
    const hub = cyl(1.3 * s, 1.6 * s, 1.4 * s, grey, 14); hub.rotation.x = Math.PI / 2; hub.position.z = 0.6 * s; elG.add(hub);
    const focus = new THREE.Vector3(0, 0, 1.4 * s + f);
    for (let i = 0; i < 4; i++) { // feed struts
      const a = i * Math.PI / 2 + Math.PI / 4, rr = R * 0.86;
      const p = new THREE.Vector3(Math.cos(a) * rr, Math.sin(a) * rr, 1.4 * s + rr * rr / (4 * f));
      const strut = cyl(0.07 * s + 0.03, 0.07 * s + 0.03, p.distanceTo(focus), steel, 5);
      strut.position.copy(p).lerp(focus, 0.5); strut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), focus.clone().sub(p).normalize()); elG.add(strut);
    }
    const feed = cyl(0.32 * s, 0.55 * s, 1.2 * s, white, 10); feed.rotation.x = Math.PI / 2; feed.position.copy(focus); elG.add(feed);
    elG.rotation.x = -Math.PI / 2; // stowed pointing at zenith; slice 6b drives az/el
    return { root, azG, elG, pivotH: d.pivotH };
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

  function makeBuilding(e, w, h, dpt, bodyMat) {
    const g = new THREE.Group();
    const body = box(w, h, dpt, bodyMat, 0.5); body.position.y = h / 2 + 0.7; g.add(body);
    const stripe = box(w + 0.2, 0.6, dpt + 0.2, accent, 0.2); stripe.position.y = h + 0.1; g.add(stripe);
    const win = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 1.6, 0.3), windowMat); win.position.set(0, h * 0.55, dpt / 2 + 0.05); g.add(win);
    const win2 = win.clone(); win2.position.z = -dpt / 2 - 0.05; g.add(win2);
    return g;
  }

  const entities = entitiesFromStation(station);
  for (const e of entities) {
    const g = new THREE.Group();
    if (e.kind === 'antenna') {
      const m = makeDish(e); g.add(m.root);
      const pad = cyl(e.diameterM * 0.7, e.diameterM * 0.75, 0.6, mat('#CAC5BD'), 24); pad.position.y = 0.3; g.add(pad);
      place(g, e);
      dishes.set(e.id, { ...m, entity: e, group: g });
      addLight(e.position.x + 6, terrainHeight(e.position.x, e.position.z) + 6, e.position.z + 6, '#ffe2a8', 14);
    } else if (e.kind === 'facility' && e.facilityKind === 'radome') {
      const shell = mesh(new THREE.IcosahedronGeometry(7.4, 2), mat('#F6F5F1', { transparent: true, opacity: 0.92 })); shell.position.y = 6.3; g.add(shell);
      const ring = cyl(6.7, 7.0, 1.8, mat('#D9D4CC'), 24); ring.position.y = 0.9; g.add(ring);
      place(g, e);
    } else if (e.kind === 'facility' && e.facilityKind === 'power-plant') {
      const hall = makeBuilding(e, 18, 6, 10, mat('#cfc8bb')); g.add(hall);
      for (let i = 0; i < 3; i++) { const tank = cyl(1.4, 1.4, 4.5, steel, 14); tank.position.set(-6 + i * 6, 3, 8); g.add(tank); }
      place(g, e);
      addLight(e.position.x, terrainHeight(e.position.x, e.position.z) + 7, e.position.z + 8, '#ffe2a8', 16);
    } else if (e.kind === 'facility') {
      g.add(makeBuilding(e, 26, 7, 14, mat('#ECE8E1')));
      place(g, e);
      addLight(e.position.x, terrainHeight(e.position.x, e.position.z) + 9, e.position.z + 11, '#ffe2a8', 18);
    }
  }

  // Lamp posts on a ring road: legible silhouette of the campus at night.
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2, x = Math.cos(a) * 85, z = Math.sin(a) * 85;
    const post = cyl(0.15, 0.2, 5, steel, 6); post.position.set(x, terrainHeight(x, z) + 2.5, z); scene.add(post);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), lampMat); bulb.position.set(x, terrainHeight(x, z) + 5.2, z); scene.add(bulb);
  }

  /** Elevation pivot of an antenna in scene coordinates, or the station origin on the terrain when unknown. */
  function pivotOf(id) {
    const d = dishes.get(id);
    if (!d) return { x: 0, y: terrainHeight(0, 0), z: 0 };
    return { x: d.group.position.x, y: d.group.position.y + d.pivotH, z: d.group.position.z };
  }

  return {
    entities, dishes, pickables, pivotOf,
    update({ sun }) {
      const k = envFromSun(sun.elDeg).stationLights;
      windowMat.emissiveIntensity = 1.6 * k;
      lampMat.emissiveIntensity = 2.2 * k;
      for (const l of lights) l.intensity = l.userData.power * k;
    },
  };
}
