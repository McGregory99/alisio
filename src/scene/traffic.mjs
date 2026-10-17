// A handful of slow service cars on the ring road: they keep a gap (yield), stop briefly at the buildings and
// show headlights at night. Pure motion lives in traffic-math. Cars are an illustrative placeholder.
import { RING_R, ringRoad } from './campus-math.mjs';
import { buildLoop, pointAt, stepTraffic, angleToS } from './traffic-math.mjs';
import { terrainHeight } from './terrain-math.mjs';

export function createTraffic({ THREE, scene, entities }) {
  const group = new THREE.Group();
  group.name = 'service-traffic';
  group.userData.provenance = 'illustrative';
  scene.add(group);
  const loop = buildLoop(ringRoad(RING_R + 0.0, 72));
  const m = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, flatShading: true, ...o });
  const glass = m('#1c2a3a', { metalness: 0.4, roughness: 0.2 }), tyre = m('#202226');
  const headMat = new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff2c0', emissiveIntensity: 0 });
  const add = (g, geo, mat, x, y, z) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  const wheels = (g, xs, zs, r = 0.5) => { for (const x of xs) for (const z of zs) { const w = add(g, new THREE.CylinderGeometry(r, r, 0.4, 10).rotateZ(Math.PI / 2), tyre, x, r, z); w.castShadow = false; } };
  const lamps = (g, y, z, x) => { for (const sx of [-x, x]) add(g, new THREE.BoxGeometry(0.4, 0.25, 0.1), headMat, sx, y, z); };

  const body = { white: m('#f1efe9'), blue: m('#2f6fbf'), teal: m('#2f6f7a'), grey: m('#cfd3d8') };
  const makeVan = () => { const g = new THREE.Group(); add(g, new THREE.BoxGeometry(2.2, 2, 4.8), body.white, 0, 1.5, 0); add(g, new THREE.BoxGeometry(2.24, 0.3, 4), body.blue, 0, 1.2, -0.2); add(g, new THREE.BoxGeometry(2.24, 0.7, 1), glass, 0, 2.05, 1.7); wheels(g, [-1, 1], [-1.5, 1.5]); lamps(g, 1.2, 2.42, 0.7); return g; };
  const makePickup = () => { const g = new THREE.Group(); add(g, new THREE.BoxGeometry(2, 1.2, 2.6), body.grey, 0, 1.1, 1); add(g, new THREE.BoxGeometry(2, 0.9, 1.6), body.grey, 0, 1.05, -1.5); add(g, new THREE.BoxGeometry(2.02, 0.6, 1), glass, 0, 1.85, 1.1); wheels(g, [-0.95, 0.95], [-1.5, 1.5], 0.45); lamps(g, 1.1, 2.32, 0.65); return g; };
  const makeTanker = () => { const g = new THREE.Group(); add(g, new THREE.BoxGeometry(2.3, 2, 1.8), body.teal, 0, 1.6, 2.2); add(g, new THREE.BoxGeometry(2.34, 0.6, 0.8), glass, 0, 2.2, 2.8); add(g, new THREE.CylinderGeometry(1.15, 1.15, 4.4, 14).rotateX(Math.PI / 2), body.white, 0, 1.9, -1.1); wheels(g, [-1.05, 1.05], [-2.6, -0.8, 2.2]); lamps(g, 1.3, 3.12, 0.75); return g; };
  const makeCrew = () => { const g = new THREE.Group(); add(g, new THREE.BoxGeometry(1.9, 1, 4.2), body.blue, 0, 1, 0); add(g, new THREE.BoxGeometry(1.8, 0.7, 2.2), glass, 0, 1.75, -0.2); wheels(g, [-0.9, 0.9], [-1.3, 1.3], 0.42); lamps(g, 1, 2.12, 0.6); return g; };

  const ent = (k) => entities.find((e) => e.facilityKind === k)?.position;
  const stopAngles = [ent('building'), ent('power-plant'), ent('radome')].filter(Boolean).map((p) => Math.atan2(p.z, p.x));
  const stops = stopAngles.map((a) => ({ s: angleToS(loop, a), dwell: 7 })).sort((a, b) => a.s - b.s);
  const defs = [
    { id: 'van', mk: makeVan, s: 20, vmax: 6 },
    { id: 'pickup', mk: makePickup, s: loop.length * 0.3, vmax: 7.5 },
    { id: 'tanker', mk: makeTanker, s: loop.length * 0.55, vmax: 4.5 },
    { id: 'crew', mk: makeCrew, s: loop.length * 0.8, vmax: 6.5 },
  ];
  // each car's first stop is the next one ahead of it; stops then come in loop order
  const firstStop = (s) => { const i = stops.findIndex((st) => st.s > s); return i < 0 ? 0 : i; };
  let cars = defs.map((d) => ({ id: d.id, s: d.s, v: 0, vmax: d.vmax, wait: 0, stop: firstStop(d.s) }));
  const models = defs.map((d) => { const g = d.mk(); group.add(g); return g; });

  return {
    group, get cars() { return cars; },
    setNight(k) { headMat.emissiveIntensity = 3 * k; },
    update({ dt = 0.016 }) {
      cars = stepTraffic(cars, loop, Math.min(dt, 0.1), { stops });
      cars.forEach((c, i) => {
        const p = pointAt(loop, c.s);
        models[i].position.set(p.x, terrainHeight(p.x, p.z) + 0.15, p.z);
        models[i].rotation.y = p.heading;
      });
    },
  };
}
