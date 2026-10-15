// Pure search model (R6.3): items built from mission and station data, matched by name tokens.
/** @returns {Array<{id:string, kind:'satellite'|'antenna'|'facility'|'link', label:string, haystack:string}>} */
export function searchItemsFrom({ missions, entities }) {
  const sats = missions.map((m) => ({ id: `sat-${m.norad}`, kind: 'satellite', label: m.name, haystack: `${m.name} ${m.id} ${m.norad}`.toLowerCase() }));
  const own = entities.map((e) => ({ id: e.id, kind: e.kind, label: e.label, haystack: `${e.label} ${e.id} ${e.operator ?? ''}`.toLowerCase() }));
  return [...sats, ...own];
}

/** Items whose haystack contains every query token; label prefix matches first; capped at `limit`. */
export function matchItems(items, query, limit = 8) {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  const hits = items.filter((i) => tokens.every((t) => i.haystack.includes(t)));
  const rank = (i) => (i.label.toLowerCase().startsWith(tokens[0]) ? 0 : 1);
  return hits.sort((a, b) => rank(a) - rank(b)).slice(0, limit);
}
