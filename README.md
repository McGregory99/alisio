# Alisio - Maspalomas Ground Station Watch

An unofficial, illustrative 3D world of the Maspalomas ground station on Gran Canaria. It shows real satellite passes (11 active Copernicus Sentinel missions, computed in the browser with SGP4) with antennas that track them, a data-flow animation and an operations dashboard.

> Unofficial and illustrative. Not affiliated with ESA, the European Commission or INTA.

Elements are tagged `verified` (confirmed from public sources) or `illustrative` (artistic placeholder or assumption). The product uses no ESA, Copernicus or INTA logos.

## Run

There is no build step. Serve the folder over HTTP and open it in a browser (Node 22 or later):

```sh
npm start            # http://127.0.0.1:8080/
PORT=8795 npm start  # another port
```

`file://` is not supported. Three.js r160 is loaded from a CDN through the import map in `index.html`, so the first load needs internet access; satellite.js 7.1.0 is vendored in `vendor/`.

## Tests

```sh
npm test             # node --test "test/**/*.test.mjs"
```

The core (`src/core`) is DOM-free and covered by unit tests; scene and UI keep their pure logic in `*-math.mjs` and `*-model.mjs` files that are tested the same way.

## Data sources

- **Orbits**: CelesTrak GP data in OMM JSON (group `NAME=SENTINEL`). The app ships an embedded snapshot (epoch 2026-10-14) and works fully offline from it. Nothing is requested on page load.
- **Live refresh**: only when you press "Refresh orbit data". At most one request every 2 hours; a 403 or 404 stops further attempts in the session and the current data stays active. The header shows source, epoch and age, with a warning past 7 days.
- **Station and missions**: plain data in `src/data/`. Maspalomas is described as data, so another station record renders its own antennas with no code change.

## Extras

- **Weather**: pick clear, calima dust haze, Atlantic cloud/rain or strong trade wind. This is an illustration you choose, not a live feed. Rain adds a small X-band fade (at most 3 dB, shown in the detail panel); a strong trade wind stows the antennas and affected passes are marked unserved.
- **EDRS relays**: an optional layer (off by default) with EDRS-A (9 E) and EDRS-C (31 E) as historical, optional relays of unverified status.

## Notes on accuracy

- **Coast (amended R4.1)**: the coast is shown as "coast direction and relative distance indicated with a label; geometry compressed for legibility and marked illustrative". The sea lies south of the station, and the in-scene label reads "coast (compressed, illustrative)". The real shoreline is not scale-consistent with the campus.
- **Bands**: payload downlink is X-band. Sentinel TT&C prime is Kiruna; S-band capability at Maspalomas is shown but not claimed as prime.
- **Reference point**: look angles are computed from the station geodetic origin; dish pointing uses each antenna pivot.
- Sky positions are directions, not distances. Doppler uses an illustrative carrier frequency.
