// Detailed campus buildings (illustrative placeholders): operations/processing building with window rows, roof units
// and an antenna mast, power plant with generator sets, tanks and a transformer yard, radome with panel seams,
// and a small equipment shelter beside each dish. Windows are collected and drawn as ONE instanced mesh.
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function createBuildingKit({ THREE }) {
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, flatShading: true, ...o });
  const m = {
    white: mat('#E7E4DE'), grey: mat('#DAD6CF'), steel: mat('#8b929b', { metalness: 0.4, roughness: 0.4 }), accent: mat('#2f6fbf'),
    concrete: mat('#cfc8bb'), roof: mat('#9a9690'), dark: mat('#3a3f46'), red: mat('#d84a3a'), pad: mat('#CAC5BD'), hall: mat('#ECE8E1'),
    tank: mat('#e9e6df', { metalness: 0.2, roughness: 0.5 }), louvre: mat('#5d646d'),
  };
  const mesh = (g, mm) => { const o = new THREE.Mesh(g, mm); o.castShadow = o.receiveShadow = true; return o; };
  const box = (w, h, d, mm, r = 0.25) => mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 0.01, h / 2 - 0.01, d / 2 - 0.01)), mm);
  const plain = (w, h, d, mm) => mesh(new THREE.BoxGeometry(w, h, d), mm);
  const cyl = (rt, rb, h, mm, seg = 14) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mm);
  const windows = []; // { group, x, y, z, ry }

  /** Window rows on the long faces of a building body (local coordinates, centred on x/z). */
  function windowRows(g, w, h, d, { rows = 2, cols = 8, y0 = 1.9 } = {}) {
    const gap = (w - 4) / cols;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) for (const side of [1, -1]) {
      windows.push({ g, x: -w / 2 + 2 + gap * (c + 0.5), y: y0 + r * 2.5, z: side * (d / 2 + 0.06), ry: side === 1 ? 0 : Math.PI });
    }
  }

  function ops() {
    const g = new THREE.Group(), w = 30, h = 8, d = 15;
    const body = box(w, h, d, m.hall, 0.5); body.position.y = h / 2 + 0.7; g.add(body);
    const plinth = plain(w + 0.6, 0.9, d + 0.6, m.concrete); plinth.position.y = 0.45; g.add(plinth);
    const stripe = box(w + 0.3, 0.6, d + 0.3, m.accent, 0.2); stripe.position.y = h + 0.3; g.add(stripe);
    const annex = box(10, 5, 8, m.grey, 0.4); annex.position.set(w / 2 + 4, 3.2, 2); g.add(annex);
    const canopy = plain(6, 0.3, 3, m.dark); canopy.position.set(-6, 3.4, d / 2 + 1.5); g.add(canopy);
    const door = plain(2.6, 2.6, 0.3, m.dark); door.position.set(-6, 2.2, d / 2 + 0.1); g.add(door);
    windowRows(g, w, h, d, { rows: 2, cols: 9 });
    for (const [x, z] of [[-8, -3], [0, 2], [9, -2]]) { // roof units
      const u = plain(3.6, 1.6, 2.6, m.roof); u.position.set(x, h + 1.7, z); g.add(u);
      const fan = cyl(0.9, 0.9, 0.25, m.dark, 12); fan.position.set(x, h + 2.6, z); g.add(fan);
    }
    const mast = cyl(0.2, 0.32, 16, m.white, 8); mast.position.set(w / 2 - 3, h + 8.7, -d / 2 + 2); g.add(mast);
    for (let i = 0; i < 4; i++) { const band = cyl(0.34 - i * 0.02, 0.34 - i * 0.02, 1.6, i % 2 ? m.white : m.red, 8); band.position.set(w / 2 - 3, h + 3 + i * 3.4, -d / 2 + 2); g.add(band); }
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff3b3b', fog: false })); beacon.position.set(w / 2 - 3, h + 16.9, -d / 2 + 2); g.add(beacon);
    for (const y of [h + 9, h + 13]) { const yagi = plain(3.2, 0.1, 0.1, m.steel); yagi.position.set(w / 2 - 3, y, -d / 2 + 2); g.add(yagi); }
    return g;
  }

  function power() {
    const g = new THREE.Group(), w = 20, h = 6.5, d = 11;
    const body = box(w, h, d, mat('#cfc8bb'), 0.4); body.position.y = h / 2 + 0.7; g.add(body);
    const stripe = box(w + 0.3, 0.5, d + 0.3, m.accent, 0.2); stripe.position.y = h + 0.5; g.add(stripe);
    windowRows(g, w, h, d, { rows: 1, cols: 5, y0: 3.4 });
    for (const x of [-5, 5]) { // generator set vents on the long face
      const lv = plain(4.2, 3.2, 0.25, m.louvre); lv.position.set(x, 3, d / 2 + 0.15); g.add(lv);
      const stack = cyl(0.35, 0.4, 4.5, m.steel, 8); stack.position.set(x, h + 3, -2); g.add(stack);
    }
    for (let i = 0; i < 3; i++) { const rad = plain(3, 1.6, 1.6, m.roof); rad.position.set(-6 + i * 6, h + 1.5, 2.5); g.add(rad); }
    const day = cyl(1.2, 1.2, 6, m.tank, 14); day.rotation.z = Math.PI / 2; day.position.set(-2, 1.6, 10); g.add(day);
    for (let i = 0; i < 3; i++) { const tank = cyl(1.8, 1.8, 6, m.tank, 16); tank.position.set(-8 + i * 5.5, 3.7, -11); g.add(tank); const cap = cyl(1.8, 1.8, 0.5, m.accent, 16); cap.position.set(-8 + i * 5.5, 6.9, -11); g.add(cap); }
    const yard = plain(10, 0.3, 8, m.pad); yard.position.set(16, 0.15, 0); g.add(yard); // transformer yard
    for (let i = 0; i < 2; i++) { const t = box(2.6, 2.6, 2.2, m.dark, 0.2); t.position.set(14 + i * 4, 1.6, 0); g.add(t); for (const sx of [-0.8, 0, 0.8]) { const ins = cyl(0.14, 0.14, 1.2, m.white, 6); ins.position.set(14 + i * 4 + sx, 3.5, 0); g.add(ins); } }
    return g;
  }

  function radome(g) {
    const ico = new THREE.IcosahedronGeometry(7.4, 2);
    const shell = mesh(ico, mat('#F6F5F1', { transparent: true, opacity: 0.92 })); shell.position.y = 6.3; g.add(shell);
    const seams = new THREE.LineSegments(new THREE.EdgesGeometry(ico, 12), new THREE.LineBasicMaterial({ color: '#b9b4aa', transparent: true, opacity: 0.55 }));
    seams.position.y = 6.3; g.add(seams);
    const ring = cyl(6.7, 7.0, 1.8, mat('#D9D4CC'), 24); ring.position.y = 0.9; g.add(ring);
    const band = cyl(7.02, 7.02, 0.35, m.accent, 24); band.position.y = 1.4; g.add(band);
    const door = plain(2, 2.4, 0.4, m.dark); door.position.set(0, 1.4, 7.0); g.add(door);
    return g;
  }

  function shelter(g, x, z) {
    const s = box(3.4, 2.4, 2.4, m.hall, 0.3); s.position.set(x, 1.2, z); g.add(s);
    const roof = box(3.5, 0.35, 2.5, m.accent, 0.1); roof.position.set(x, 2.5, z); g.add(roof);
    const ac = plain(1, 0.7, 0.5, m.roof); ac.position.set(x + 0.6, 2.9, z); g.add(ac);
  }

  /** Bake the collected windows into one instanced mesh in world space. Call after every group is placed. */
  function bakeWindows(scene, windowMat) {
    const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(2.1, 1.3), windowMat, Math.max(1, windows.length));
    const mtx = new THREE.Matrix4(), local = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    windows.forEach((w, i) => {
      w.g.updateWorldMatrix(true, false);
      local.compose(new THREE.Vector3(w.x, w.y, w.z), q.setFromEuler(e.set(0, w.ry, 0)), new THREE.Vector3(1, 1, 1));
      im.setMatrixAt(i, mtx.multiplyMatrices(w.g.matrixWorld, local));
    });
    im.count = windows.length;
    scene.add(im);
    return im;
  }

  return { mat: m, mesh, box, plain, cyl, ops, power, radome, shelter, bakeWindows };
}
