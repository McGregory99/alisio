// Selection (R6.2): a clicked entity opens its provenance card (labels) and the camera flies to it.
// Satellites also start follow mode, which keeps tracking until Escape or the chip's Stop button.
export function createSelection({ THREE, camera: cam, sky }) {
  const chip = document.createElement('div');
  chip.id = 'follow-chip';
  chip.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);display:none;gap:10px;align-items:center;padding:6px 8px 6px 12px;border-radius:16px;background:rgba(12,18,28,.85);color:#e8eef7;font:13px system-ui,sans-serif;z-index:12';
  const text = document.createElement('span');
  const stop = document.createElement('button');
  stop.type = 'button'; stop.textContent = 'Stop (Esc)';
  stop.style.cssText = 'font:inherit;color:#0b1220;background:#9fd0ff;border:0;border-radius:10px;padding:3px 10px;cursor:pointer';
  stop.addEventListener('click', () => cam.stopFollow());
  chip.append(text, stop);
  document.body.appendChild(chip);

  const box = new THREE.Box3(), size = new THREE.Vector3(), centre = new THREE.Vector3();

  let followed = null;

  /** Fly to a pick `{ object, entity }`; satellites are followed. */
  function flyToTarget({ object, entity }) {
    if (entity.kind === 'satellite') {
      followed = object;
      cam.setLock(true);
      cam.flyTo(() => object.position, { dist: 140, follow: true, label: `Following ${entity.label}` });
      return;
    }
    box.setFromObject(object); box.getCenter(centre); box.getSize(size);
    const c = centre.clone();
    cam.setLock(true);
    cam.flyTo(() => c, { dist: Math.min(1100, Math.max(45, size.length() * 1.5)) });
  }

  /** Fly to a named view point, for presets and search. */
  function flyToPoint(point, dist) {
    const c = new THREE.Vector3(point.x, point.y, point.z);
    cam.setLock(false);
    cam.flyTo(() => c, { dist });
  }

  /** Fly to an area preset `{ target, dist, dirFrom }` (R6.4). */
  function flyToArea({ target, dist, dirFrom }) {
    const c = new THREE.Vector3(target.x, target.y, target.z);
    cam.setLock(false);
    cam.flyTo(() => c, { dist, dirFrom });
  }

  return {
    flyToTarget, flyToPoint, flyToArea, chip,
    update() {
      if (followed && !followed.visible) { cam.stopFollow(); followed = null; } // the satellite set: nothing left to track
      const label = cam.following();
      chip.style.display = label ? 'flex' : 'none';
      if (label) text.textContent = label;
    },
  };
}
