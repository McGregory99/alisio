// Pure callout helpers (no DOM): distance fade, greedy screen-space de-overlap with a cap, dish chip text.

/** 1 up to 60% of `maxDist`, then linearly to 0 at `maxDist`. */
export function chipAlpha(dist, maxDist) {
  const start = maxDist * 0.6;
  if (dist <= start) return 1;
  return Math.max(0, 1 - (dist - start) / (maxDist - start));
}

const overlaps = (a, b, pad) =>
  Math.abs(a.x - b.x) * 2 < a.w + b.w + pad * 2 && Math.abs(a.y - b.y) * 2 < a.h + b.h + pad * 2;

/**
 * Greedy placement: highest priority first (nearer first on ties); a chip is kept when it is inside the viewport,
 * overlaps no kept chip, and fewer than `maxChips` are kept.
 * Items are { id, x, y, w, h, priority, dist? } with x/y the chip centre in pixels. Returns the Set of kept ids.
 */
export function placeChips(items, { maxChips, width, height, pad = 4 }) {
  const order = [...items].sort((a, b) => b.priority - a.priority || (a.dist ?? 0) - (b.dist ?? 0));
  const kept = [];
  for (const c of order) {
    if (kept.length >= maxChips) break;
    if (c.x + c.w / 2 < 0 || c.x - c.w / 2 > width || c.y + c.h / 2 < 0 || c.y - c.h / 2 > height) continue;
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
