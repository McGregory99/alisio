// Space view: keep zooming out past the local scene's maximum distance and the view hands over (fade-through) to the
// Earth seen from space, with the satellites' orbits. A second THREE.Scene on the same renderer, with its own camera and
// controls. Zoom back in past the minimum distance, press Esc or use the button to return to the station at the
// camera state it was left in. The local scene is simply not rendered meanwhile; the dashboard keeps running.
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { glowTexture } from './fx-textures.mjs';
import { COASTLINES } from '../data/coastlines.mjs';
import { gmstRad } from '../core/sgp4.mjs';
import { sunDirectionEci } from '../core/sun-eci.mjs';
import { EARTH_RADIUS_KM, eciToScene, rotateAboutY, nearestScreenPoint, occludedBySphere, starField } from './space-math.mjs';
import { initialTransition, stepTransition, fadeAlpha, showsSpace, pushZoom, ZOOM_THRESHOLD } from './space-transition.mjs';
import { createEarth } from './space-earth.mjs';
import { createSpaceOrbits } from './space-orbits.mjs';
import { CAMERA_LIMITS } from './camera.mjs';

const MIN_DIST = EARTH_RADIUS_KM * 1.25, MAX_DIST = EARTH_RADIUS_KM * 9, START_DIST = EARTH_RADIUS_KM * 2.9;
const LABEL_CSS = 'position:absolute;left:0;top:0;white-space:nowrap;pointer-events:none;font:600 12px/1.2 system-ui,sans-serif;color:#eaf2ff;text-shadow:0 0 3px #000,0 0 6px #000;padding:1px 4px;display:none;will-change:transform';

export function createSpaceView({ THREE, renderer, canvas, container, station, orbitSource, missions, localCamera, getSelectedId }) {
  let state = initialTransition();
  let acc = { amount: 0, lastMs: 0 };
  let pendingEnter = false, pendingLeave = false;
  let disabled = false, built = false, showing = false;
  let sceneObjs = null; // { scene, camera, controls, earth, orbits }
  let hover = null;     // pointer position relative to the canvas, or null
  let frameSimMs = 0;

  // Dark overlay for the fade-through, hint line and the way back.
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:absolute;inset:0;background:#02050b;opacity:0;pointer-events:none;z-index:4';
  const hint = document.createElement('div');
  hint.setAttribute('aria-live', 'polite');
  hint.style.cssText = 'position:absolute;left:50%;bottom:calc(var(--disclaimer-h, 28px) + 96px);transform:translateX(-50%);padding:6px 12px;border-radius:12px;background:rgba(10,16,26,.72);color:#dfe9f6;font:12.5px system-ui,sans-serif;opacity:0;pointer-events:none;z-index:4;transition:opacity .15s';
  const labels = document.createElement('div');
  labels.style.cssText = 'position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:3';
  const mkLabel = () => { const el = document.createElement('div'); el.style.cssText = LABEL_CSS; labels.appendChild(el); return el; };
  const stationLabel = mkLabel(), hoverLabel = mkLabel(), selLabel = mkLabel();
  container.append(overlay, hint, labels);

  const back = document.createElement('button');
  back.type = 'button'; back.id = 'space-back'; back.className = 'glass'; back.setAttribute('data-hud', '');
  back.setAttribute('aria-keyshortcuts', 'Escape');
  back.style.cssText = 'position:fixed;z-index:14;left:50%;transform:translateX(-50%);top:calc(var(--gap, 10px) * 2 + var(--topbar-h, 52px));display:none;gap:8px;align-items:center;padding:7px 14px;border-radius:12px;font:600 13px system-ui,sans-serif;color:var(--ink, #ebf0f6);cursor:pointer';
  back.append('Back to station');
  const kbd = document.createElement('kbd'); kbd.textContent = 'Esc'; kbd.setAttribute('aria-hidden', 'true'); kbd.style.cssText = 'font:11px system-ui,sans-serif;opacity:.7;border:1px solid currentColor;border-radius:4px;padding:0 4px';
  back.append(kbd);
  document.body.appendChild(back);
  back.addEventListener('click', () => { pendingLeave = true; });

  const localDistance = () => localCamera.controls.getDistance();
  const spaceDistance = () => (sceneObjs ? sceneObjs.controls.getDistance() : Infinity);
  function onPush(deltaY, nowMs) {
    const r = pushZoom(acc, { phase: state.phase, deltaY, distance: state.phase === 'space' ? spaceDistance() : localDistance(), localMax: CAMERA_LIMITS.maxDistance, spaceMin: MIN_DIST, nowMs });
    acc = r.acc;
    if (r.enterSpace && !disabled) pendingEnter = true;
    if (r.leaveSpace) pendingLeave = true;
  }
  canvas.addEventListener('wheel', (e) => onPush(e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY, e.timeStamp), { passive: true });
  let pinch = null;
  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 2) { pinch = null; return; }
    const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    if (pinch != null) onPush((pinch - d) * 3, e.timeStamp); // fingers together = zoom out
    pinch = d;
  }, { passive: true });
  canvas.addEventListener('touchend', () => { pinch = null; }, { passive: true });
  canvas.addEventListener('pointermove', (e) => { const r = canvas.getBoundingClientRect(); hover = { x: e.clientX - r.left, y: e.clientY - r.top }; });
  canvas.addEventListener('pointerleave', () => { hover = null; });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && state.phase === 'space') pendingLeave = true; });

  function build() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#02050b');
    const camera = new THREE.PerspectiveCamera(40, 1, 200, 400000);
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true; controls.dampingFactor = 0.08;
    controls.enablePan = false; controls.rotateSpeed = 0.6; controls.zoomSpeed = 0.8;
    controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
    controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE };
    controls.minDistance = MIN_DIST; controls.maxDistance = MAX_DIST;
    controls.enabled = false;
    const glow = glowTexture(THREE);
    const earth = createEarth({ THREE, coastlines: COASTLINES, station, glowTexture: glow });
    scene.add(earth.root);
    const stars = starField(700);
    const sp = new Float32Array(stars.length * 3), sc = new Float32Array(stars.length * 3);
    stars.forEach((s, i) => { sp.set([s.x * 150000, s.y * 150000, s.z * 150000], i * 3); sc.set([0.75 * s.b, 0.85 * s.b, s.b], i * 3); });
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); sg.setAttribute('color', new THREE.BufferAttribute(sc, 3));
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false })));
    const orbits = createSpaceOrbits({ THREE, parent: scene, missions, glowTexture: glow });
    sceneObjs = { scene, camera, controls, earth, orbits };
    built = true;
  }

  /** Put the camera on the line from the Earth centre through the station, looking at the centre. */
  function faceStation(simMs) {
    const { camera, controls, earth } = sceneObjs;
    const p = rotateAboutY(earth.stationPoint, gmstRad(new Date(simMs)));
    const k = START_DIST / Math.hypot(p.x, p.y, p.z);
    camera.position.set(p.x * k, p.y * k, p.z * k);
    controls.target.set(0, 0, 0);
    controls.update();
  }

  function setMode() {
    localCamera.controls.enabled = state.phase === 'local';
    if (sceneObjs) sceneObjs.controls.enabled = state.phase === 'space';
  }

  const project = (p, cam, w, h) => {
    const v = new THREE.Vector3(p.x, p.y, p.z).project(cam);
    return v.z > 1 || v.z < -1 ? null : { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h };
  };

  function placeLabels() {
    const { camera, earth, orbits } = sceneObjs;
    const r = canvas.getBoundingClientRect(), w = r.width, h = r.height;
    const cam = camera.position;
    const hud = [...document.querySelectorAll('[data-hud]')].map((el) => el.getBoundingClientRect()).filter((q) => q.width > 0 && q.height > 0);
    const blocked = (x, y) => hud.some((q) => x + r.left > q.left - 6 && x + r.left < q.right + 6 && y + r.top > q.top - 6 && y + r.top < q.bottom + 6);
    const items = orbits.items();
    const screen = items.map((it) => (it.position && !occludedBySphere(cam, it.position) ? project(it.position, camera, w, h) : null));
    const hov = hover ? nearestScreenPoint(screen, hover.x, hover.y, 18) : -1;
    const selId = getSelectedId?.() ?? null;
    const sel = selId ? items.findIndex((it) => `sat-${it.norad}` === selId) : -1;
    orbits.setSelected(sel >= 0 ? items[sel].norad : null);
    const put = (el, p, text, dx = 8, dy = -18) => {
      if (!p || blocked(p.x, p.y)) { el.style.display = 'none'; return; }
      if (el.textContent !== text) el.textContent = text;
      el.style.display = 'block';
      el.style.transform = `translate(${Math.round(p.x + dx)}px,${Math.round(p.y + dy)}px)`;
    };
    const sw = rotateAboutY(earth.stationPoint, earth.group.rotation.y);
    put(stationLabel, occludedBySphere(cam, sw) ? null : project(sw, camera, w, h), station.name, 10, -22);
    put(selLabel, sel >= 0 ? screen[sel] : null, sel >= 0 ? items[sel].mission.name : '', 10, 4);
    put(hoverLabel, hov >= 0 && hov !== sel ? screen[hov] : null, hov >= 0 ? items[hov].mission.name : '', 10, 4);
  }

  function updateScene(simMs) {
    const { earth, orbits } = sceneObjs;
    const date = new Date(simMs);
    earth.spin(gmstRad(date));
    earth.setSun(eciToScene(sunDirectionEci(date)));
    orbits.update(orbitSource.current().records, simMs);
    sceneObjs.controls.update();
    placeLabels();
  }

  return {
    active: () => state.phase === 'space' || state.phase === 'to-space',
    phase: () => state.phase,
    /** Camera distance to the orbit target of the scene being controlled (m local, km space). */
    distance: () => (state.phase === 'space' ? spaceDistance() : localDistance()),
    /** Start the way back (used when a satellite is picked from the dashboard). */
    leave() { if (state.phase === 'space') pendingLeave = true; },
    update(frame) {
      frameSimMs = frame.simMs;
      const prev = state;
      state = stepTransition(state, { dt: frame.dt, enterSpace: pendingEnter, leaveSpace: pendingLeave });
      pendingEnter = pendingLeave = false;
      if (state.phase !== prev.phase) { acc = { amount: 0, lastMs: 0 }; setMode(); }
      overlay.style.opacity = String(fadeAlpha(state));
      const want = showsSpace(state);
      if (want) {
        try {
          if (!built) { build(); setMode(); }
          if (!showing) faceStation(frame.simMs);
          updateScene(frame.simMs);
        } catch (e) {
          console.warn('Space view unavailable:', e?.message ?? e);
          disabled = true; state = initialTransition(); overlay.style.opacity = '0'; setMode();
          back.style.display = 'none'; labels.style.display = 'none';
          return;
        }
      }
      if (want !== showing) { const co = document.getElementById('callouts'); if (co) co.style.display = want ? 'none' : ''; }
      showing = want;
      back.style.display = want ? 'inline-flex' : 'none';
      labels.style.display = want ? 'block' : 'none';
      const pushing = (state.phase === 'local' || state.phase === 'space') && acc.amount > 0;
      hint.textContent = state.phase === 'space' ? 'Keep zooming in to return to the station' : 'Keep zooming out to see the Earth from space';
      hint.style.opacity = pushing ? String(Math.min(0.95, 0.25 + acc.amount / ZOOM_THRESHOLD)) : '0';
    },
    /** Draw the space scene when it is the visible one; false leaves the frame to the local scene. */
    render() {
      if (!showing || !sceneObjs) return false;
      const { scene, camera } = sceneObjs;
      const a = canvas.width / Math.max(1, canvas.height);
      if (Math.abs(camera.aspect - a) > 1e-4) { camera.aspect = a; camera.updateProjectionMatrix(); }
      const tm = renderer.toneMapping;
      renderer.toneMapping = THREE.NoToneMapping;
      renderer.render(scene, camera);
      renderer.toneMapping = tm;
      return true;
    },
    /** Test hook: the simulated time of the last frame. */
    get simMs() { return frameSimMs; },
  };
}
