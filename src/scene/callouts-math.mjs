// Pure callout helpers (no DOM): distance fade, greedy screen-space de-overlap with a cap, dish chip text.

/** 1 up to 60% of `maxDist`, then linearly to 0 at `maxDist`. */
export function chipAlpha(dist, maxDist) {
  const start = maxDist * 0.6;
  if (dist <= start) return 1;
  return Math.max(0, 1 - (dist - start) / (maxDist - start));
}

const overlaps = (a, b, pad) =>
  Math.abs(a.x - b.x) * 2 < a.w + b.w + pad * 2 && Math.abs(a.y - b.y) * 2 < a.h + b.h + pad * 2;

const hitsRect = (c, r) => c.x + c.w / 2 > r.left && c.x - c.w / 2 < r.right && c.y + c.h / 2 > r.top && c.y - c.h / 2 < r.bottom;

/** Screen rectangles of the visible HUD elements (empty or hidden ones have no area and are skipped). */
export function hudRects(elements) {
  return elements.map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0)
    .map((r) => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom }));
}

/** Pull a chip (centre x/y, size w/h) fully inside the viewport, keeping `margin` px from every edge. */
export function clampChip(c, { width, height, margin = 6 }) {
  const x = Math.min(Math.max(c.x, margin + c.w / 2), width - margin - c.w / 2);
  const y = Math.min(Math.max(c.y, margin + c.h / 2), height - margin - c.h / 2);
  return { ...c, x, y };
}

/** Distance under which a chip with this `maxDist` shows even when nothing selects it. */
export const closeDist = (maxDist) => Math.min(maxDist * 0.35, 240);

/** Anchor ids that belong to the passes running now: the antennas of the active lanes and their satellites. */
export function activeAnchorIds(lanes) {
  const ids = new Set();
  for (const [antennaId, lane] of lanes ?? []) { ids.add(antennaId); if (lane?.pass?.norad != null) ids.add(`sat-${lane.pass.norad}`); }
  return ids;
}

/**
 * Whether an anchor's chip is drawn at all. Default scene: only the selected or hovered object and the active-pass
 * antenna and satellite. Others appear when the camera is close. Notes show on selection or hover only; pipeline and
 * egress chips (`processing`) also show in the processing view.
 */
export function chipShown({ id, selectedId, hoveredId, activeIds, view, dist, maxDist, processing, note }) {
  if (id === selectedId || id === hoveredId) return true;
  if (note) return false;
  if (processing) return view === 'processing';
  if (activeIds?.has(id)) return true;
  return dist <= closeDist(maxDist);
}

/**
 * Greedy placement: highest priority first (nearer first on ties); a chip is kept when it is inside the viewport,
 * overlaps no kept chip, and fewer than `maxChips` are kept.
 * Items are { id, x, y, w, h, priority, dist? } with x/y the chip centre in pixels. Returns the Set of kept ids.
 */
export function placeChips(items, { maxChips, width, height, pad = 4, blocked = [] }) {
  const order = [...items].sort((a, b) => b.priority - a.priority || (a.dist ?? 0) - (b.dist ?? 0));
  const kept = [];
  for (const c of order) {
    if (kept.length >= maxChips) break;
    if (c.x + c.w / 2 < 0 || c.x - c.w / 2 > width || c.y + c.h / 2 < 0 || c.y - c.h / 2 > height) continue;
    if (blocked.some((r) => hitsRect(c, r))) continue;
    if (kept.some((k) => overlaps(c, k, pad))) continue;
    kept.push(c);
  }
  return new Set(kept.map((k) => k.id));
}

/** Compact chip text for a dish: "MSP-15" + "Sentinel-2B · 560 Mbit/s" or "Stowed". */
export function dishContent(id, lane) {
  if (!lane) return { title: id, sub: 'Stowed', tone: 'idle', priority: 40 };
  const name = lane.mission?.name ?? 'satellite';
  if (lane.phase === 'downlink') return { title: id, sub: `${name} · ${lane.mission?.downlink?.rateMbps ?? '?'} Mbit/s`, tone: 'live', priority: 100 };
  if (lane.phase === 'pre-position') return { title: id, sub: `Slewing to ${name}`, tone: 'prep', priority: 70 };
  return { title: id, sub: `LOS · ${name}`, tone: 'prep', priority: 60 };
}
