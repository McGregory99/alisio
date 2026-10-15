// Composition root: clock + station + scene systems.
import { createSimClock } from '../core/clock.mjs';
import { sunAzEl } from '../core/sun.mjs';
import { createSchedule } from '../core/schedule.mjs';
import { createOrbitSource } from '../core/orbit-source.mjs';
import { MISSIONS } from '../data/missions.mjs';
import { SNAPSHOT } from '../data/omm-snapshot.mjs';
import { MASPALOMAS } from '../data/stations/maspalomas.mjs';
import { createWorld } from '../scene/renderer.mjs';
import { createTerrain } from '../scene/terrain.mjs';
import { createEnv } from '../scene/env.mjs';
import { createCamera } from '../scene/camera.mjs';
import { createEgress } from '../scene/egress.mjs';
import { createLabels } from '../scene/labels.mjs';
import { createStationAssets } from '../scene/station-assets.mjs';
import { createSky } from '../scene/sky.mjs';
import { createDishes } from '../scene/dishes.mjs';
import { createSelection } from '../scene/selection.mjs';
import { createSearch } from '../ui/search.mjs';
import { searchItemsFrom } from '../ui/search-match.mjs';
import { createAreaSwitcher } from '../ui/area-switcher.mjs';
import { areasFor, stationChoices } from '../ui/areas.mjs';
import { terrainHeight } from '../scene/terrain-math.mjs';
import { createTimeControl } from '../ui/time-control.mjs';
import { createPackets } from '../scene/packets.mjs';
import { createDashboard } from '../ui/dashboard.mjs';
import { createDetail } from '../ui/detail.mjs';
import { createTracker } from '../ui/tracker.mjs';
import { createGlobe } from '../ui/globe.mjs';

const clock = createSimClock();
// No network on load: the live refresh only runs when the user asks (gated, see orbit-source).
const orbitSource = createOrbitSource({
  snapshot: SNAPSHOT, catalog: MISSIONS,
  fetchFn: (url) => fetch(url), storage: (() => { try { return localStorage; } catch { return null; } })(),
});
const schedule = createSchedule({ station: MASPALOMAS, getRecords: () => orbitSource.current().records });
const world = createWorld({
  container: document.getElementById('app'),
  getFrame: (dt) => {
    const simMs = clock.now();
    return { simMs, dt, sun: sunAzEl(new Date(simMs), MASPALOMAS.location), schedule: schedule.update(simMs) };
  },
});
const ctx = { ...world.ctx, station: MASPALOMAS };
world.add(createTerrain(ctx));
world.add(createEnv(ctx));
const assets = world.add(createStationAssets(ctx));
const egress = world.add(createEgress(ctx));
const sky = world.add(createSky({ ...ctx, pivotOf: assets.pivotOf }));
const dishes = world.add(createDishes({ station: MASPALOMAS, assets }));
const packets = world.add(createPackets({ ...ctx, pivotOf: assets.pivotOf, egress }));
const entityById = new Map(assets.entities.map((e) => [e.id, e]));
const targets = assets.pickables.map((object) => ({ object, entity: entityById.get(object.userData.entityId) }));
if (egress.link) targets.push({ object: egress.group, entity: egress.link });
const camera = createCamera(ctx);
const selection = createSelection({ THREE: ctx.THREE, camera, sky });
const labelsSys = world.add(createLabels({ ...ctx, targets: () => [...targets, ...sky.targets()], onSelect: (t) => { selection.flyToTarget(t); dashboard.select(t.entity); } }));
world.add(camera);
world.add(selection);
const areaSwitcher = createAreaSwitcher({
  areas: areasFor(MASPALOMAS, { heightAt: terrainHeight }),
  stations: stationChoices([MASPALOMAS]), // one station in data today; a second one appears here with no code change
  onArea: selection.flyToArea,
});
world.add(createTimeControl({ clock }));
const allTargets = () => [...targets, ...sky.targets()];
const searchItems = searchItemsFrom({ missions: MISSIONS, entities: assets.entities.concat(egress.link ? [egress.link] : []) });
const search = createSearch({
  items: () => searchItems,
  onPick: (item) => { const t = allTargets().find((x) => (x.entity.id === item.id)); if (t) { labelsSys.show(t.entity); selection.flyToTarget(t); dashboard.select(t.entity); } },
});
const dashboard = world.add(createDashboard({ orbitSource }));
world.add(createDetail({ dashboard, orbitSource, station: MASPALOMAS }));
world.add(createTracker({ dashboard }));
world.add(createGlobe({ dashboard, station: MASPALOMAS }));
world.start();

export { dashboard, clock, orbitSource, schedule, sky, dishes, packets, assets, egress, camera, selection, search, areaSwitcher };
