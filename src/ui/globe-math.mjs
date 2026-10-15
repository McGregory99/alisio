// Orthographic projection for the mini globe (R7.4). North is up, east is right, `centre` sits at the origin.
const RAD = Math.PI / 180;

/** Offset from the globe centre in a globe of radius `radius`; `visible` is false on the far side. */
export function project(latDeg, lonDeg, centre, radius) {
  const lat = latDeg * RAD, dlon = (lonDeg - centre.lonDeg) * RAD, lat0 = centre.latDeg * RAD;
  const cosc = Math.sin(lat0) * Math.sin(lat) + Math.cos(lat0) * Math.cos(lat) * Math.cos(dlon);
  return {
    x: radius * Math.cos(lat) * Math.sin(dlon),
    y: -radius * (Math.cos(lat0) * Math.sin(lat) - Math.sin(lat0) * Math.cos(lat) * Math.cos(dlon)),
    visible: cosc >= 0,
  };
}

/** Split a track into runs of consecutive visible points, so lines never cross behind the globe. */
export function visibleRuns(points, centre, radius) {
  const runs = [];
  let run = [];
  for (const p of points) {
    const q = project(p.latDeg, p.lonDeg, centre, radius);
    if (q.visible) run.push(q);
    else if (run.length) { runs.push(run); run = []; }
  }
  if (run.length) runs.push(run);
  return runs;
}
