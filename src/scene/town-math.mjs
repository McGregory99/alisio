// Pure layout of the low-rise coastal town patch south of the station (no Three.js). ILLUSTRATIVE: the real resort
// strip lies on the shore south and south-east of the station, but individual buildings are not modelled from data.
export const TOWN_BOX = Object.freeze({ x0: -350, x1: 900, z0: 1540, z1: 1730 });

function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/**
 * Deterministic block layout: [{ x, z, w, d, h, y0, rot, tone }]. Lots sit on a jittered grid with a street every
 * fifth row/column, only on land at least `minLand` m above the sea and gentle enough (corner height spread under
 * `maxSpread`), 2-5 storeys high. `y0` is the box base (a little below the lowest corner so nothing floats).
 */
export function townLots({ seed = 5, heightAt, box = TOWN_BOX, minLand = 3, maxSpread = 3.5 } = {}) {
  const rnd = mulberry32(seed), out = [];
  let col = 0;
  for (let x = box.x0; x < box.x1; x += 34, col++) {
    let row = 0;
    for (let z = box.z0; z < box.z1; z += 30, row++) {
      if (col % 5 === 4 || row % 4 === 3) continue; // streets
      const w = 14 + rnd() * 14, d = 12 + rnd() * 10, h = 6 + Math.floor(rnd() * 4) * 3.2;
      const cx = x + (rnd() - 0.5) * 6, cz = z + (rnd() - 0.5) * 5;
      const hs = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => heightAt(cx + sx * w / 2, cz + sz * d / 2));
      const lo = Math.min(...hs), hi = Math.max(...hs);
      if (lo < minLand || hi - lo > maxSpread) continue;
      out.push({ x: cx, z: cz, w, d, h, y0: lo - 1.2, rot: 0, tone: Math.floor(rnd() * 4) });
    }
  }
  return out;
}
