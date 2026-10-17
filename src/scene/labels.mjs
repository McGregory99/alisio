// Labels and provenance badges. Pure content lives in labels-math; this module draws it.
import { labelText, badgeFor } from './labels-math.mjs';
import { getAnchors } from './callouts-registry.mjs';
import { chipAlpha, placeChips, chipShown, clampChip, activeAnchorIds, hudRects } from './callouts-math.mjs';

export function textSprite(THREE, text, { width = 512, height = 96, scale = [150, 28] } = {}) {
  const c = document.createElement('canvas');
  c.width = width; c.height = height;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(12,18,28,.72)'; g.fillRect(0, 0, width, height);
  g.fillStyle = '#e8eef7'; g.font = '600 32px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, width / 2, height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(scale[0], scale[1], 1);
  s.renderOrder = 10;
  return s;
}

/** Click a labelled element to read its provenance badge and note. `targets` = [{ object, entity }] or a function returning it. */
export function createLabels({ THREE, scene, camera, canvas, targets, onSelect = () => {} }) {
  const card = document.createElement('div');
  card.id = 'element-label';
  card.setAttribute('role', 'status');
  card.style.cssText = 'position:fixed;left:16px;bottom:44px;max-width:320px;padding:10px 12px;border-radius:8px;background:rgba(12,18,28,.85);color:#e8eef7;font:13px/1.4 system-ui,sans-serif;z-index:11;display:none';
  document.body.appendChild(card);
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let down = null;
  const list = () => (typeof targets === 'function' ? targets() : targets);

  function show(entity) {
    const t = labelText(entity);
    card.replaceChildren();
    const title = document.createElement('strong'); title.textContent = t.title;
    const badge = document.createElement('span'); badge.className = 'badge'; badge.textContent = t.badge;
    badge.style.cssText = `margin-left:8px;padding:1px 7px;border-radius:9px;font-size:11px;color:#0b1220;background:${badgeFor(entity.provenance).color}`;
    const note = document.createElement('div'); note.textContent = t.note; note.style.marginTop = '4px';
    card.append(title, badge, note);
    card.style.display = 'block';
  }
  function targetAt(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hidden = (o) => { for (; o; o = o.parent) if (!o.visible) return true; return false; };
    for (const hit of ray.intersectObjects(list().map((t) => t.object), true)) {
      if (hidden(hit.object)) continue;
      let o = hit.object;
      while (o) { const t = list().find((x) => x.object === o); if (t) return t; o = o.parent; }
    }
    return null;
  }
  function pick(ev) {
    const t = targetAt(ev.clientX, ev.clientY);
    if (t) { show(t.entity); return onSelect(t); }
    card.style.display = 'none';
    document.dispatchEvent(new CustomEvent('alisio:deselect')); // the dashboard closes the detail panel
  }
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', (e) => { if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 5) pick(e); down = null; });

  // Hover: the object under the pointer gets its chip while the pointer rests on it (sampled, not per event).
  let pointer = null, hovered = null, hoverAt = 0;
  canvas.addEventListener('pointermove', (e) => { pointer = { x: e.clientX, y: e.clientY, buttons: e.buttons }; });
  canvas.addEventListener('pointerleave', () => { pointer = null; hovered = null; });
  function sampleHover(now) {
    if (now - hoverAt < 120) return;
    hoverAt = now;
    hovered = pointer && !pointer.buttons ? (targetAt(pointer.x, pointer.y)?.entity?.id ?? null) : null;
  }

  const chips = createChips({ THREE, scene, camera, canvas, state: () => ({ hovered }), linkIds: () => new Set(list().filter((t) => t.entity?.kind === 'link').map((t) => t.entity.id)), onPick: (entityId) => {
    const t = list().find((x) => x.entity?.id === entityId);
    if (t) { show(t.entity); onSelect(t); }
  } });

  return { card, show, update(frame) { sampleHover(performance.now()); chips.update(frame); } };
}

const TONES = { live: '#4fd8ff', idle: '#7d8896', prep: '#ffb454', sat: '#9fd0ff', note: '#5b6675', facility: '#c9b99a' };
const CHIP_CSS = 'position:absolute;left:0;top:0;display:none;white-space:nowrap;padding:3px 8px 3px 7px;border-radius:7px;background:rgba(12,18,28,.8);color:#e8eef7;font:600 11.5px/1.25 ui-monospace,SFMono-Regular,Menlo,monospace;border-left:3px solid #e0a64f;box-shadow:0 2px 10px rgba(0,0,0,.35);pointer-events:auto;cursor:pointer;will-change:transform,opacity';

/** Screen-space callout chips (compact, de-overlapped, distance-faded, capped) for every registered anchor. */
function createChips({ THREE, scene, camera, canvas, state, linkIds, onPick }) {
  const layer = document.createElement('div');
  layer.id = 'callouts';
  layer.setAttribute('aria-hidden', 'true');
  layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:5';
  document.body.appendChild(layer);
  const pool = new Map(); // anchor id -> { el, key, w, h }
  const v = new THREE.Vector3();

  function chipFor(id) {
    let c = pool.get(id);
    if (!c) {
      const el = document.createElement('div');
      el.style.cssText = CHIP_CSS;
      c = { el, key: '', w: 120, h: 22, id };
      el.addEventListener('click', (e) => { e.stopPropagation(); if (c.entityId) onPick(c.entityId); });
      layer.appendChild(el);
      pool.set(id, c);
    }
    return c;
  }
  function fill(c, content) {
    const key = JSON.stringify([content.title, content.sub, content.tone, content.provenance, content.lines]);
    if (key === c.key) return;
    c.key = key;
    c.entityId = content.entityId ?? null;
    c.el.style.cursor = c.entityId ? 'pointer' : 'default';
    c.el.style.borderLeftColor = content.provenance ? badgeFor(content.provenance).color : (TONES[content.tone] ?? TONES.note);
    c.el.replaceChildren();
    const head = document.createElement('div');
    const dot = document.createElement('span');
    dot.style.cssText = `display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:6px;background:${TONES[content.tone] ?? TONES.note};box-shadow:0 0 6px ${TONES[content.tone] ?? TONES.note}`;
    const title = document.createElement('span'); title.textContent = content.title;
    head.append(dot, title);
    if (content.sub) { const sub = document.createElement('span'); sub.textContent = ` · ${content.sub}`; sub.style.cssText = 'font-weight:500;color:#b8c4d4'; head.append(sub); }
    c.el.append(head);
    for (const l of content.lines ?? []) {
      const row = document.createElement('div');
      row.textContent = (l.on ? '▸ ' : '  ') + l.text;
      row.style.cssText = `font-weight:${l.on ? 700 : 500};color:${l.on ? '#e8eef7' : '#7d8896'}`;
      c.el.append(row);
    }
    c.el.style.display = 'block'; c.el.style.visibility = 'hidden'; // measure
    c.w = c.el.offsetWidth; c.h = c.el.offsetHeight;
  }

  return {
    layer,
    update(frame) {
      const r = canvas.getBoundingClientRect();
      const W = r.width, H = r.height;
      const dataset = document.documentElement.dataset;
      const view = { selectedId: dataset.selected || null, hoveredId: state().hovered, view: dataset.area || 'campus', activeIds: activeAnchorIds(frame?.schedule?.lanes) };
      const processing = linkIds();
      const blocked = hudRects([...document.querySelectorAll('[data-hud]')]).map((q) => ({ left: q.left - r.left, right: q.right - r.left, top: q.top - r.top, bottom: q.bottom - r.top }));
      const items = [];
      for (const [id, a] of getAnchors(scene)) {
        const content = a.content(frame);
        const c = pool.get(id);
        if (!content) { if (c) c.el.style.display = 'none'; continue; }
        const p = a.point();
        v.set(p.x, p.y, p.z);
        const dist = v.distanceTo(camera.position);
        const alpha = chipAlpha(dist, a.maxDist);
        const shown = chipShown({ ...view, id, dist, maxDist: a.maxDist, processing: id === 'pipeline-stages' || processing.has(id), note: content.tone === 'note' && !content.lines && !content.entityId });
        v.project(camera);
        if (!shown || alpha <= 0.02 || v.z > 1 || v.z < -1) { if (c) c.el.style.display = 'none'; continue; }
        const chip = chipFor(id);
        fill(chip, content);
        const picked = id === view.selectedId || id === view.hoveredId;
        items.push(clampChip({ id, x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H - chip.h / 2 - 6, w: chip.w, h: chip.h, priority: picked ? 1000 : (content.priority ?? 20), dist, alpha: picked ? 1 : alpha }, { width: W, height: H }));
      }
      const kept = placeChips(items, { maxChips: W < 700 ? 4 : 8, width: W, height: H, blocked });
      const byId = new Map(items.map((i) => [i.id, i]));
      for (const [id, c] of pool) {
        const it = byId.get(id);
        if (!it || !kept.has(id)) { c.el.style.display = 'none'; continue; }
        c.el.style.display = 'block'; c.el.style.visibility = 'visible';
        c.el.style.opacity = String(it.alpha);
        c.el.style.zIndex = String(10000 - Math.round(it.dist));
        c.el.style.transform = `translate3d(${(r.left + it.x - c.w / 2).toFixed(1)}px,${(r.top + it.y - c.h / 2).toFixed(1)}px,0)`;
      }
    },
  };
}
