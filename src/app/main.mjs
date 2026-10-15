// Composition root: clock + station + scene systems.
import { createSimClock } from '../core/clock.mjs';
import { sunAzEl } from '../core/sun.mjs';
import { MASPALOMAS } from '../data/stations/maspalomas.mjs';
import { createWorld } from '../scene/renderer.mjs';
import { createTerrain } from '../scene/terrain.mjs';
import { createEnv } from '../scene/env.mjs';
import { createCamera } from '../scene/camera.mjs';
import { createStationAssets } from '../scene/station-assets.mjs';

const clock = createSimClock();
const world = createWorld({
  container: document.getElementById('app'),
  getFrame: (dt) => {
    const simMs = clock.now();
    return { simMs, dt, sun: sunAzEl(new Date(simMs), MASPALOMAS.location) };
  },
});
const ctx = { ...world.ctx, station: MASPALOMAS };
world.add(createTerrain(ctx));
world.add(createEnv(ctx));
const assets = world.add(createStationAssets(ctx));
world.add(createCamera(ctx));
world.start();

export { clock };
