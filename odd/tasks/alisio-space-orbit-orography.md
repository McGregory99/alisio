# Alisio: space view, orbit-around-selection, faithful orography
Objective: three polish features. Branch: feat/space-orbit-orography. Delivery: ask-on-risk (feature branch, merge to main by the user's call; user earlier authorised merge+deploy). Test runner: `npm test` (node --test).

## Specs
- S1: "si haces mucho zoom hacia atras acabas viendo el globo desde el espacio en 3d y ves las orbitas de los satelites alli"
- S2: "si seleccionas un objeto (satelite, edificio...) una vez se haga zoom te deje girar la camara respecto al objeto, o sea con el en el centro"
- S3: "Analiza la orografia y los planos de la estacion para que el ambiente sea mas fidedigno a la realidad"
- Assumption A1: coastline data for the 3D globe is embedded from Natural Earth 110m (public domain), simplified, in `src/data/`; no image assets (branding test).
- Assumption A2: space view reuses SGP4 orbit records already loaded; orbits are inertial (ECI) loops, Earth rotated by GMST.

## Tasks
- T1 (S2) orbit around the selected object: inline. Status: todo
- T2 (S1) 3D space view with orbits: delegated writer (worktree), parallel with T3. Status: todo
- T3 (S3) orography + station plan fidelity: research (done by haiku) then delegated writer, disjoint files from T2. Status: todo

## Log
- L1 (2026-10-18, user): "vale ahora quiero que, si haces mucho zoom hacia atras acabas viendo el globo desde el espacio en 3d y ves las orbitas de los satelites alli. Tambien quiero que si seleccionas un objeto (satelite, edificio...) una vez se haga zoom te deje girar la camara respecto al objeto, os ea ocn el en el centro. Analiza la orografia y los planos de la estacion para que el ambiente sea mas fidedigno a la realidad. Esto son varias tareas"
