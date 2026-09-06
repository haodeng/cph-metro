# Copenhagen M1 3D Ride

An interactive 3D journey along Copenhagen Metro M1, from Vanløse to Vestamager. It combines a crisp OpenStreetMap basemap with MapLibre building extrusions, a mapped M1 alignment, 3D metro infrastructure, landmark labels, and a simulated train ride.

## Run locally

```bash
npm install
npm run dev -- --host 127.0.0.1
```

Build the production bundle with:

```bash
npm run build
```

## Controls

| Control | Result |
| --- | --- |
| Right arrow / Forward | Move towards Vestamager |
| Left arrow / Back | Move towards Vanløse |
| Auto ride | Continues in the most recent travel direction |
| Follow train | Recentres the camera on M1 |
| Station or map label | Jumps to that station or landmark |
| 3D metro | Shows or hides the illustrated metro structures |

Manual movement pauses Auto ride. At either terminus, Auto ride travels back along the line without teleporting. The ride is a 6× playback simulation with smooth acceleration, braking, and brief stops; it is not live metro service or an official timetable.

## Data and realism

The M1 train follows the OpenStreetMap M1 relation rather than straight lines between station points. Building footprints, heights, and available colours come from OpenFreeMap/OpenMapTiles and OpenStreetMap.

Landmarks include Det Kongelige Teater, Rosenborg Slot, Vor Frelsers Kirke, Christiansborg Slot, Rundetårn, and Frederiksberg Slot. Rosenborg and Rundetårn use a generic CC0 brick material to add facade detail. Their geometry, dimensions, roofs, and textures are simplified map visualisations, not surveyed or photo-accurate 3D models.

DR Byen carries the verified DR wordmark at its mapped building location. It is used as an identifier for the place, not as a general decoration or endorsement.

Field's beside Ørestad uses a glass-and-metal facade tint and its current official site mark on the mapped extrusion. Its footprint, height, and roof geometry remain map data; this is not a bespoke 3D reconstruction.

Royal Arena between Ørestad and Vestamager uses the supplied logo and a warm terracotta façade cue based on the venue's documented vertical fins. Its footprint, height, and roof geometry remain map data; this is not a bespoke 3D reconstruction.

Christiania is marked near Christianshavn with the supplied logo. Its canopy accents and warm community lights are illustrative, map-anchored details rather than a survey of activity in the area.

The track alignment is mapped; the visible track height and station structures are illustrative. Dashed line sections identify underground M1 where the train indicator is deliberately shown at the surface.

Five illustrative cattle markers are placed in the grass near Sundby. They are decorative map details and do not represent real livestock locations.

## Project structure

| Path | Purpose |
| --- | --- |
| `src/main.js` | Map setup, controls, camera following, and layers |
| `src/route.js` | M1 alignment, interpolation, and 3D metro structures |
| `src/ride.js` | Bidirectional Auto ride simulation |
| `src/landmarks.js` | Landmark labels and brick material selection |
| `src/cattle.js` | Illustrative, map-anchored cattle near Sundby |
| `src/christiania.js` | Illustrative community lights and canopy accents near Christiania |
| `src/data/m1.json` | Bundled OpenStreetMap M1 geometry |
| `src/data/landmarks.json` | Bundled landmark footprints and sources |
| `public/textures/` | Landmark material assets and attribution |

## Verification

```bash
node scripts/check-route.mjs
node scripts/check-landmarks.mjs
node scripts/check-ride.mjs
npm run build
```

## Credits

- Map rendering: [MapLibre GL JS](https://maplibre.org/)
- Basemap, M1 alignment, landmark footprints, and labels: [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), under [ODbL 1.0](https://opendatacommons.org/licenses/odbl/)
- Building vector data: [OpenFreeMap](https://openfreemap.org/) and [OpenMapTiles](https://www.openmaptiles.org/)
- Brick material: [Poly Haven Brick Wall 001](https://polyhaven.com/a/brick_wall_001), [CC0](https://polyhaven.com/license)
- DR wordmark: [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Danmarks_Radio_logo.svg); DR is its trademark owner
- Field's site mark: [Field's official website](https://fields.steenstrom.dk/); Field's is its trademark owner
- Royal Arena façade reference: [Danish Architecture Center](https://dac.dk/en/magazine/places/royal-arena-285); logo supplied by the user
