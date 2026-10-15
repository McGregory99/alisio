// Labels and provenance badges. Pure content lives in labels-math; this module draws it.
import { labelText, badgeFor } from './labels-math.mjs';

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
export function createLabels({ THREE, camera, canvas, targets, onSelect = () => {} }) {
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
  function pick(ev) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hidden = (o) => { for (; o; o = o.parent) if (!o.visible) return true; return false; };
    for (const hit of ray.intersectObjects(list().map((t) => t.object), true)) {
      if (hidden(hit.object)) continue;
      let o = hit.object;
      while (o) { const t = list().find((x) => x.object === o); if (t) { show(t.entity); return onSelect(t); } o = o.parent; }
    }
    card.style.display = 'none';
  }
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', (e) => { if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 5) pick(e); down = null; });

  return { card, show, update() {} };
}
