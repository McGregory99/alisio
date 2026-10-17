// Pure helpers for sparklines: bucketing, sampling and the SVG path. No DOM.

/** Counts of `times` per equal bucket of [startMs, endMs); times outside the window are ignored. */
export function bucketCounts(times, startMs, endMs, n) {
  const out = new Array(n).fill(0);
  const span = endMs - startMs;
  if (span <= 0) return out;
  for (const t of times) {
    if (t < startMs || t >= endMs) continue;
    out[Math.min(n - 1, Math.floor(((t - startMs) / span) * n))] += 1;
  }
  return out;
}

/** `n` evenly spaced samples of fn(t) from startMs to endMs, both included. */
export function rangeSeries(fn, startMs, endMs, n) {
  return Array.from({ length: n }, (_, i) => fn(n === 1 ? endMs : startMs + ((endMs - startMs) * i) / (n - 1)));
}

/** Series scaled to 0..1; a flat series sits in the middle. */
export function normalise(values) {
  if (!values.length) return [];
  const min = Math.min(...values), max = Math.max(...values);
  return values.map((v) => (max === min ? 0.5 : (v - min) / (max - min)));
}

/** SVG path of a polyline fitted into w x h with `pad`; higher values are drawn higher. Empty under two points. */
export function sparkPath(values, w, h, pad = 2) {
  if (values.length < 2) return '';
  return normalise(values)
    .map((v, i) => `${i ? 'L' : 'M'}${(pad + (i * (w - 2 * pad)) / (values.length - 1)).toFixed(2)} ${(h - pad - v * (h - 2 * pad)).toFixed(2)}`)
    .join(' ');
}
