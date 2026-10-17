# Sentinel 3D models

No official Sentinel glTF is published (only paid marketplace listings and non-exportable viewers), so every model is
generated in code from public dimensions: `src/scene/sentinel-spec.mjs` (pure table, tested) and
`src/scene/sentinel-models.mjs` (low-poly builder, metres, nadir = -y, solar wings along x, along-track = z).
No third-party model is downloaded or embedded.

## Dimensions and sources

| Family | Bus (m) | Solar array | Instruments modelled | Sources |
| --- | --- | --- | --- | --- |
| Sentinel-1 | 3.4 x 1.3 x 1.3 (stowed) | 2 wings x 5 panels, "10 m" per wing (modelled as 5 x 2.0 x 1.6 m, approx) | C-SAR 12.3 x 0.84 m, 5 tiles; X-band dish (approx) | https://www.eoportal.org/satellite-missions/copernicus-sentinel-1 |
| Sentinel-2 | 3.4 x 1.8 x 2.35 (public figure, approx) | 1 wing x 3 panels, 7.1 m2 total (panel 1.6 x 1.5, approx) | MSI 1.47 x 0.93 x 0.62 m under the bus; X-band dish (approx) | https://www.eoportal.org/satellite-missions/copernicus-sentinel-2 |
| Sentinel-3 | 3.9 x 2.2 x 2.21 | 1 wing x 3 panels, 10.5 m2 total (panel 1.5 x 2.3, approx) | OLCI 5-camera fan, SLSTR, SRAL dish ~1.2 m (approx), MWR dish (approx) | https://www.eoportal.org/satellite-missions/copernicus-sentinel-3 |
| Sentinel-5P | ~3.35 tall (approx; hexagonal bus drawn as a box 1.9 x 1.9 x 3.35) | 1 wing x 3 panels (1.25 x 2.1, approx), 5.63 m overall diameter | TROPOMI nadir aperture (approx size) | https://en.wikipedia.org/wiki/Sentinel-5_Precursor |
| Sentinel-6 | 5.13 x 4.17 x 2.34 stowed (bus drawn 2.34 x 2.34 x 4.17, approx) | 2 wings x 2 panels (approx; published span not found) | Poseidon-4 nadir dish ~1.5 m (approx), AMR-C dish (approx) | https://en.wikipedia.org/wiki/Sentinel-6 |

Anything marked approx is an estimate from photographs, not a published figure; each spec entry lists its own `approx` items.

## In the scene

`sky.mjs` builds one model per catalog mission (id or family), wraps it with `orientForSky` (nadir -> +z, the axis
`lookAt` points at the dish, wings stay horizontal) and scales it with `displayScale` = `(16 + 2.2 * extent) / extent`
units per metre, so shown size stays between ~20 and ~70 scene units while Sentinel-1 remains larger than Sentinel-5P.
Unknown ids fall back to the previous generic model (`sat-model.mjs`).

## Model inspector

`/?models=1` replaces the world with the five models side by side on a plain background (hidden debug route, hooked in
`src/app/main.mjs`). Options: `&only=S1|S2|S3|S5P|S6`, `&view=iso|nadir|top|side|front`, `&spin=1`.
