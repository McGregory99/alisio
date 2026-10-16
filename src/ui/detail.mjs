// Detail panel (R7.3, R5.7, R5.8): the selected satellite (or, until one is selected, the satellite of the
// running or next served pass) with orbit data, live look angles, Doppler and a polar sky plot.
import { h, setText } from './dom.mjs';
import { badge } from './badge.mjs';
import { detailRows, TTC_STATEMENT } from './detail-model.mjs';
import { createSkyplot } from './skyplot.mjs';
import { sampleTrack, rangeRate, dopplerHz } from '../core/passes.mjs';
import { REFERENCE_NOTE } from '../core/pointing.mjs';
import { missionByNorad } from '../data/missions.mjs';
import { labelText } from '../scene/labels-math.mjs';
import { fadeLine, passWeatherNote } from './weather-model.mjs';

const REFRESH_MS = 250;

export function createDetail({ dashboard, orbitSource, station, weather }) {
  const title = h('div', { class: 'row' });
  const list = h('dl');
  const plot = createSkyplot();
  const passLine = h('p', { class: 'note' });
  const entityNote = h('p', { class: 'note' });
  const fadeNote = h('p', { class: 'note', 'data-weather-fade': '' });
  const body = h('div', { class: 'detail' }, title, list, plot.canvas, passLine, fadeNote, entityNote,
    h('p', { class: 'note', text: TTC_STATEMENT }),
    h('p', { class: 'note', text: REFERENCE_NOTE }));
  dashboard.mount('detail', 'Detail', body, { order: 20 });

  const tracks = new Map(); // pass id -> samples
  let acc = REFRESH_MS, shownKey = null;
  dashboard.onSelect(() => { acc = REFRESH_MS; });

  const noradOf = (entity) => (entity?.kind === 'satellite' ? Number(String(entity.id).replace('sat-', '')) : null);

  function defaultNorad(schedule, simMs) {
    const lane = [...schedule.lanes.values()][0];
    if (lane) return lane.pass.norad;
    const next = schedule.assignments.find((a) => a.status === 'assigned' && a.pass.los >= simMs);
    return next?.pass.norad ?? null;
  }

  function showEntity(entity) {
    const t = labelText(entity);
    title.replaceChildren(h('strong', { text: t.title }), badge(entity.provenance));
    list.replaceChildren();
    setText(passLine, '');
    plot.canvas.hidden = true;
    setText(entityNote, t.note);
    shownKey = `entity:${entity.id}`;
  }

  return {
    update({ simMs, dt, schedule }) {
      acc += Math.max(0, dt) * 1000;
      if (acc < REFRESH_MS) return;
      acc = 0;
      const sel = dashboard.selected();
      if (sel && sel.kind !== 'satellite') { if (shownKey !== `entity:${sel.id}`) showEntity(sel); return; }
      const norad = noradOf(sel) ?? defaultNorad(schedule, simMs);
      const mission = norad != null ? missionByNorad(norad) : null;
      const s = schedule.satellites.find((x) => x.norad === norad);
      const omm = orbitSource.current().records.find((r) => r.NORAD_CAT_ID === norad);
      if (!mission || !s || !omm) { title.replaceChildren(h('span', { class: 'muted', text: 'No satellite selected' })); list.replaceChildren(); plot.canvas.hidden = true; setText(passLine, ''); setText(fadeNote, ''); return; }
      plot.canvas.hidden = false; setText(entityNote, ''); setText(fadeNote, weather ? fadeLine(weather.current()) : ''); shownKey = `sat:${norad}`;

      const visible = s.elDeg != null && s.elDeg > 0;
      const dop = visible ? dopplerHz(mission.downlink.hz, rangeRate(s.sat, station.location, simMs)) : null;
      const rows = detailRows({ mission, omm, state: { azDeg: s.azDeg, elDeg: s.elDeg, rangeKm: s.rangeKm, visible, antennaId: s.antennaId }, dopplerHz: dop });
      title.replaceChildren(h('strong', { text: mission.name }), badge(mission.provenance));
      list.replaceChildren(...rows.filter((r) => r.id !== 'mission').flatMap((r) => [h('dt', { text: r.label }), h('dd', { text: r.value })]));

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
