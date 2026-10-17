// Detail card (R7.3, R5.7, R5.8): shown only while a satellite or antenna is selected. A satellite gets live look angles,
// Doppler, orbit data and a polar sky plot; the antenna utilisation bars sit below. The dashboard shows and hides the panel.
import { h, setText } from './dom.mjs';
import { badge } from './badge.mjs';
import { detailRows } from './detail-model.mjs';
import { createSkyplot } from './skyplot.mjs';
import { antennaUtilisation } from './utilisation-model.mjs';
import { sampleTrack, rangeRate, dopplerHz } from '../core/passes.mjs';
import { missionByNorad } from '../data/missions.mjs';
import { labelText } from '../scene/labels-math.mjs';
import { fadeLine, passWeatherNote } from './weather-model.mjs';

const REFRESH_MS = 250;
const GRID_IDS = ['inclination', 'period', 'altitude', 'eccentricity'];

export function createDetail({ dashboard, orbitSource, station, weather }) {
  const title = h('div', { class: 'd-title' });
  const plot = createSkyplot();
  const stat = (label, big) => { const k = h('p', { class: 'eyebrow', text: label }), v = h('div', { class: `v num${big ? ' big' : ''}` }); return { k, v, el: h('div', { class: 'row' }, k, v) }; };
  const azel = stat('Az / El', true), range = stat('Range'), doppler = stat('Doppler');
  const hero = h('div', { class: 'hero' }, plot.canvas, h('div', { class: 'hero-stats' }, azel.el, range.el, doppler.el));
  const gridCells = new Map(GRID_IDS.map((id) => { const k = h('p', { class: 'eyebrow' }), v = h('div', { class: 'v num' }); return [id, { k, v, el: h('div', { class: 'cell' }, k, v) }]; }));
  const grid = h('div', { class: 'grid' }, ...[...gridCells.values()].map((c) => c.el));
  const passLine = h('p', { class: 'note' });
  const entityNote = h('p', { class: 'note' });
  const fadeNote = h('p', { class: 'note', 'data-weather-fade': '' });
  const utilRows = new Map(station.antennas.map((a) => {
    const bar = h('i'), pct = h('span', { class: 'num' });
    return [a.id, { bar, pct, el: h('div', { class: 'u-row' }, h('span', { text: a.id }), h('div', { class: 'u-bar' }, bar), pct) }];
  }));
  const util = h('div', { class: 'util', role: 'group', 'aria-label': 'Antenna utilisation, 24 hour window centred on now' },
    h('p', { class: 'eyebrow', text: 'Antenna utilisation, +-12 h (simulated schedule)' }), ...[...utilRows.values()].map((r) => r.el));
  const body = h('div', { class: 'detail' }, title, hero, grid, passLine, fadeNote, entityNote, util);
  dashboard.mount('detail', 'Detail', body, { order: 20 });

  const tracks = new Map(); // pass id -> samples
  let acc = REFRESH_MS, shownKey = null;
  dashboard.onSelect(() => { acc = REFRESH_MS; });

  const noradOf = (entity) => (entity?.kind === 'satellite' ? Number(String(entity.id).replace('sat-', '')) : null);

  function showEntity(entity) {
    const t = labelText(entity);
    title.replaceChildren(h('strong', { text: t.title }), badge(entity.provenance));
    hero.hidden = grid.hidden = true;
    setText(passLine, ''); setText(fadeNote, '');
    setText(entityNote, t.note);
    shownKey = `entity:${entity.id}`;
  }

  function showUtilisation(schedule, simMs) {
    const entries = schedule.finished.map((f) => ({ pass: f.pass, antennaId: f.antennaId }))
      .concat(schedule.assignments.map((a) => ({ pass: a.pass, antennaId: a.status === 'assigned' ? a.antennaId : null })));
    for (const u of antennaUtilisation(entries, station.antennas.map((a) => a.id), simMs)) {
      const r = utilRows.get(u.id);
      r.bar.style.width = `${Math.round(u.share * 100)}%`;
      setText(r.pct, `${Math.round(u.share * 100)}%`);
    }
  }

  return {
    update({ simMs, dt, schedule }) {
      acc += Math.max(0, dt) * 1000;
      if (acc < REFRESH_MS) return;
      acc = 0;
      const sel = dashboard.selected();
      if (!sel) return; // nothing selected: the panel is hidden
      showUtilisation(schedule, simMs);
      if (sel.kind !== 'satellite') { if (shownKey !== `entity:${sel.id}`) showEntity(sel); return; }
      const norad = noradOf(sel);
      const mission = norad != null ? missionByNorad(norad) : null;
      const s = schedule.satellites.find((x) => x.norad === norad);
      const omm = orbitSource.current().records.find((r) => r.NORAD_CAT_ID === norad);
      if (!mission || !s || !omm) {
        title.replaceChildren(h('span', { class: 'muted', text: 'No satellite selected' }));
        hero.hidden = grid.hidden = true; setText(passLine, ''); setText(fadeNote, ''); setText(entityNote, '');
        return;
      }
      hero.hidden = grid.hidden = false; setText(entityNote, ''); setText(fadeNote, weather ? fadeLine(weather.current()) : ''); shownKey = `sat:${norad}`;

      const visible = s.elDeg != null && s.elDeg > 0;
      const dop = visible ? dopplerHz(mission.downlink.hz, rangeRate(s.sat, station.location, simMs)) : null;
      const rows = detailRows({ mission, omm, state: { azDeg: s.azDeg, elDeg: s.elDeg, rangeKm: s.rangeKm, visible, antennaId: s.antennaId }, dopplerHz: dop });
      const byId = new Map(rows.map((r) => [r.id, r]));
      title.replaceChildren(h('strong', { text: mission.name }), badge(mission.provenance),
        h('span', { class: 'bd', 'data-band': mission.downlink.band, text: mission.downlink.band }),
        h('span', { class: 'chip', 'data-tone': visible ? 'live' : 'idle', text: visible ? 'in view' : 'below horizon' }));
      setText(azel.v, byId.get('azel').value); setText(range.v, byId.get('range').value); setText(doppler.v, byId.get('doppler').value);
      setText(doppler.k, byId.get('doppler').label);
      for (const id of GRID_IDS) { const c = gridCells.get(id); setText(c.k, byId.get(id).label); setText(c.v, byId.get(id).value); }

      const pa = schedule.assignments.find((a) => a.pass.norad === norad && a.pass.los >= simMs);
      let track = [];
      if (pa) {
        const p = pa.pass;
        if (!tracks.has(p.id)) { if (tracks.size > 40) tracks.clear(); tracks.set(p.id, sampleTrack(s.sat, station.location, p.aos, p.los, 10)); }
        track = tracks.get(p.id);
        const when = new Date(p.aos).toISOString().slice(11, 16);
        const wx = passWeatherNote(pa);
        setText(passLine, `Pass: AOS ${when} UTC, max elevation ${p.maxElDeg.toFixed(0)}° (${pa.status === 'assigned' ? `served by ${pa.antennaId}` : 'not served'}). Doppler uses an illustrative 8 GHz X-band carrier.${wx ? ` ${wx}` : ''}`);
      } else setText(passLine, 'No pass in the schedule window.');
      plot.draw(track, s.azDeg == null ? null : { azDeg: s.azDeg, elDeg: s.elDeg });
    },
  };
}
