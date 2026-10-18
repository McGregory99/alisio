# Alisio: space view, orbit-around-selection, faithful orography
Objective: three polish features. Branch: feat/space-orbit-orography. Delivery: ask-on-risk (feature branch, merge to main by the user's call; user earlier authorised merge+deploy). Test runner: `npm test` (node --test).

## Specs
- S1: "si haces mucho zoom hacia atras acabas viendo el globo desde el espacio en 3d y ves las orbitas de los satelites alli"
- S2: "si seleccionas un objeto (satelite, edificio...) una vez se haga zoom te deje girar la camara respecto al objeto, o sea con el en el centro"
- S3: "Analiza la orografia y los planos de la estacion para que el ambiente sea mas fidedigno a la realidad"
- Assumption A1: coastline data for the 3D globe is embedded from Natural Earth 110m (public domain), simplified, in `src/data/`; no image assets (branding test).
- Assumption A2: space view reuses SGP4 orbit records already loaded; orbits are inertial (ECI) loops, Earth rotated by GMST.

## Tasks
- T1 (S2) orbit around the selected object: inline. Status: done (81edd21; left-drag rotates around the selected object, verified in headless Chrome; test interactionScheme)
- T2 (S1) 3D space view with orbits: delegated writer (worktree feat/space-view). Status: done (c23c72e, e77c5d2, 3a3a96f; 424 tests; Chrome screenshots of transition, Earth, orbits, return)
- T3 (S3) orography + station plan fidelity: haiku research, then delegated writer (worktree feat/orography). Status: done (6de7748, 8efb2c7; 412 tests; coast at 1750 m, platform 205 m)

## Log
- L1 (2026-10-18, user): "vale ahora quiero que, si haces mucho zoom hacia atras acabas viendo el globo desde el espacio en 3d y ves las orbitas de los satelites alli. Tambien quiero que si seleccionas un objeto (satelite, edificio...) una vez se haga zoom te deje girar la camara respecto al objeto, os ea ocn el en el centro. Analiza la orografia y los planos de la estacion para que el ambiente sea mas fidedigno a la realidad. Esto son varias tareas"
