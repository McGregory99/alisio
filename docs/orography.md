# Orography of the Maspalomas scene

The surroundings of the INTA Maspalomas Space Station are built from a few verified facts. Everything else is an
artistic placeholder in the same flat-shaded clay look, and is marked illustrative here, in the station data
(`src/data/stations/maspalomas.mjs`, field `surroundings`) and in the scene (`userData.provenance`, callout badges).

Scene frame: x east, -z north, y up, 1 unit = 1 m, sea level y = 0, station at the origin.

## Verified (with sources)

| Fact | Value in the scene | Source |
| --- | --- | --- |
| Antenna position | 27 45 46.40 N, 15 38 01.68 W (`location` in station data) | ESA: https://www.esa.int/Enabling_Support/Operations/ESA_Ground_Stations/Maspalomas_station |
| Antenna elevation | 205.1 m above the WGS-84 ellipsoid; the campus platform is flat at `CAMPUS_HEIGHT = 205` m | same ESA page; Wikipedia gives 205 m |
| Distance to the coast | about 1,750 m; `COAST_Z = 1750`, the sea lies south (+z) | same ESA page |
| Direction to the sea | due south by coordinates (Meloneras shore near 27.745 N, station 27.763 N) | coordinates above |
| Distance to the main road | about 1.6 km to the Las Palmas-Mogan road, access off the south end of the motorway; the access road ends 1,600 m from the origin | same ESA page |
| Site | Montana Blanca, San Bartolome de Tirajana, south Gran Canaria | ESA / Wikipedia |
| Equipment | one 15 m dish (S/X receive, S transmit), GPS-TDAF receiver, frequency/timing, monitoring and control, no-break power plant | same ESA page |
| Wider geography | Barranco de Fataga basin (~140 km2) meets the Maspalomas plain; dune field and lighthouse south-east (~27.740 N 15.586 W, ~5 km ESE); resorts between the station and the dunes; island interior rises north (Pico de las Nieves ~1.9 km, ~20 km N-NW) | general geography, used for direction only |

Caveat: ESA's 205.1 m is an ellipsoidal height. It is used here as the height above sea level (as requested); the
geoid separation at the Canaries would lower the true height above mean sea level, so the 11.7 % mean slope is an
upper estimate.

## Illustrative (not verified)

- **Slope profile**: a straight fall from the platform to the shoreline (mean 205/1750, about 11.7 %), with a
  broad hill (28 m, sigma 300 m) under the platform for Montana Blanca, gentler rise to the north, rolling relief
  and small gullies. The shoreline wanders about 17 m around z = 1750 (zero at x = 0).
- **Barrancos**: three dry valleys running north to south to the sea, axes near x = -700, +1180 and +2450 m, 10-32 m
  deep, 110-260 m wide, with a flat gravel bed. They shallow out where the ground meets the sea. Positions are
  invented; only the existence of the Fataga barranco system east of the station is real.
- **Dune field**: a pale sand patch centred 2.6 km east and 190 m north of the shoreline. Real dunes lie further east
  (~4.7 km); the patch is nearer so that it can be seen.
- **Coastal town**: about 100 instanced plain boxes, 2-5 storeys, on the shore south of the station
  (x -350..900, z 1540..1730), standing in for the resorts. No real building is modelled.
- **Access road**: a winding alignment from a north-north-east gate to a junction with an east-west main road,
  1,600 m from the station. Only that distance is real.
- **Campus layout**: ring road, fence, gate, dish and building positions, cable trenches. No public plan of the site
  (buildings, radomes, fence, roads) could be found.
- **Mountain backdrop**: rounded ridges far north and on both flanks, only to show that the interior rises.
- **Mesh resolution**: 10 m facets within 700 m of the campus, 20 m at the shore, up to 250 m far away. Fog
  (2.6 km) hides the mesh borders (5 km east/west, 4.5 km north) from the camera limits (1.4 km from its target).
- **Sun shadow box**: follows the platform (205 m up), not the sea-level origin.
