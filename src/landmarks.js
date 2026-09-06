import landmarks from './data/landmarks.json' with { type: 'json' }

// These envelopes select existing vector buildings. They do not create or
// reshape geometry, and heights remain those supplied by the map tiles.
export const places = landmarks.features.map(feature => {
  const ring = feature.geometry.coordinates[0]
  const west = Math.min(...ring.map(p => p[0])), east = Math.max(...ring.map(p => p[0]))
  const south = Math.min(...ring.map(p => p[1])), north = Math.max(...ring.map(p => p[1]))
  const dx = .00002, dy = .00001 // Allow for tile footprint rounding (about 1 m).
  return { ...feature.properties, center: [(west + east) / 2, (south + north) / 2], bounds: [west - dx, south - dy, east + dx, north + dy] }
})

// These markers are placed only at verified OSM features: DR Byen is way
// 25520993, Field's is relation 20346870, Royal Arena is way 391594117, and
// Christiania is marked at its mapped centre (12.60216, 55.67396).
// They are never used as invented logos on unrelated landmarks.
const brandSites = [
  { name: 'DR Byen', coordinates: [12.590550467567567, 55.65797834594595], image: 'dr-logo', size: .14 },
  { name: "Field's", coordinates: [12.5775131, 55.6303752], image: 'fields-logo', size: .13 },
  { name: 'Royal Arena', coordinates: [12.5736542, 55.6254153], image: 'royal-arena-logo', size: .25 },
  { name: 'Christiania', coordinates: [12.60216, 55.67396], image: 'christiania-logo', size: .44 },
]
const fieldsFootprint = { bounds: [12.57555, 55.62931, 12.57960, 55.63129] }
const royalArenaFootprint = { bounds: [12.57273, 55.62446, 12.57457, 55.62622] }

export function containsBuilding(place, feature) {
  const { type, coordinates } = feature.geometry
  if (type !== 'Polygon' && type !== 'MultiPolygon') return false
  const points = coordinates.flat(type === 'Polygon' ? 1 : 2)
  const [west, south, east, north] = place.bounds
  return points.length > 0 && points.every(([lon, lat]) => lon >= west && lon <= east && lat >= south && lat <= north)
}

export async function addLandmarks(map) {
  const data = { type: 'FeatureCollection', features: places.map(place => ({
    type: 'Feature', properties: { name: place.name }, geometry: { type: 'Point', coordinates: place.center },
  })) }
  map.addSource('landmark-names', { type: 'geojson', data })
  map.addLayer({ id: 'landmark-names', type: 'symbol', source: 'landmark-names', minzoom: 13,
    layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Bold'], 'text-size': 14, 'text-max-width': 14, 'text-padding': 12, 'text-offset': [0, -2], 'text-anchor': 'bottom' },
    paint: { 'text-color': '#fff0c9', 'text-halo-color': '#06141e', 'text-halo-width': 2.5 },
  })

  try {
    const image = await map.loadImage(`${import.meta.env.BASE_URL}textures/brick-wall.jpg`)
    map.addImage('landmark-brick', image.data, { pixelRatio: 64 })
    const brickPlaces = places.filter(place => place.material === 'brick')
    const brickFilter = ['in', ['id'], ['literal', []]]
    const buildingFilter = ['!=', ['get', 'hide_3d'], true]
    const height = ['coalesce', ['get', 'render_height'], ['get', 'height'], 7]
    const base = ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0]
    const buildingLayer = { source: 'openmaptiles', 'source-layer': 'building', type: 'fill-extrusion', minzoom: 13, filter: ['all', buildingFilter, brickFilter] }
    map.addLayer({ ...buildingLayer, id: 'landmark-facades', paint: {
      'fill-extrusion-pattern': 'landmark-brick', 'fill-extrusion-height': height, 'fill-extrusion-base': base, 'fill-extrusion-vertical-gradient': true,
    } }, 'landmark-names')
    // Cover only the horizontal caps so brick does not repeat across the roofs.
    map.addLayer({ ...buildingLayer, id: 'landmark-roofs', paint: {
      'fill-extrusion-height': height, 'fill-extrusion-base': height,
      'fill-extrusion-color': '#74847f',
    } }, 'landmark-names')
    // MapLibre's `within` expression does not match Polygon features. Match the
    // loaded building parts geographically, then style their stable tile IDs.
    const idsByPlace = brickPlaces.map(() => new Set())
    const updateMaterials = () => {
      let changed = false
      for (const feature of map.querySourceFeatures('openmaptiles', { sourceLayer: 'building' })) {
        // Raised roof/cupola parts keep their mapped material colors.
        if (feature.id == null || feature.properties.hide_3d || feature.properties.render_min_height > 0) continue
        brickPlaces.forEach((place, index) => {
          if (!idsByPlace[index].has(feature.id) && containsBuilding(place, feature)) {
            idsByPlace[index].add(feature.id)
            changed = true
          }
        })
      }
      if (!changed) return
      const match = ['in', ['id'], ['literal', idsByPlace.flatMap(ids => [...ids])]]
      for (const id of ['landmark-facades', 'landmark-roofs']) map.setFilter(id, ['all', buildingFilter, match])
      map.setFilter('m1-city-buildings', ['all', buildingFilter, ['!', match]])
      map.setPaintProperty('landmark-roofs', 'fill-extrusion-color', ['case', ...brickPlaces.flatMap((place, index) => [
        ['in', ['id'], ['literal', [...idsByPlace[index]]]], place.roofColor || '#74847f',
      ]), '#74847f'])
    }
    map.on('sourcedata', event => { if (event.sourceId === 'openmaptiles' && event.isSourceLoaded) updateMaterials() })
    map.on('idle', updateMaterials)
    updateMaterials()
  } catch (error) {
    // Keep the original buildings and labels usable if the local image fails.
    console.warn('Landmark texture unavailable', error)
  }
}

export async function addBrandSites(map) {
  const data = { type: 'FeatureCollection', features: brandSites.map(site => ({
    type: 'Feature', properties: { name: site.name, image: site.image, size: site.size }, geometry: { type: 'Point', coordinates: site.coordinates },
  })) }
  map.addSource('brand-sites', { type: 'geojson', data })
  try {
    const [drLogo, fieldsLogo, royalArenaLogo, christianiaLogo] = await Promise.all([
      map.loadImage(`${import.meta.env.BASE_URL}textures/dr-logo.png`),
      map.loadImage(`${import.meta.env.BASE_URL}textures/fields-logo.png`),
      map.loadImage(`${import.meta.env.BASE_URL}textures/royal-arena-logo.png`),
      map.loadImage(`${import.meta.env.BASE_URL}textures/christiania-logo.jpg`),
    ])
    map.addImage('dr-logo', drLogo.data)
    map.addImage('fields-logo', fieldsLogo.data)
    map.addImage('royal-arena-logo', royalArenaLogo.data)
    map.addImage('christiania-logo', christianiaLogo.data)
    // The Field's building remains the OSM/OpenMapTiles extrusion. This tint
    // gives its broad glazed facade a clearer material cue without changing
    // its footprint, height, or roof geometry.
    const fieldsBuilding = { source: 'openmaptiles', 'source-layer': 'building', minzoom: 14,
      filter: ['in', ['id'], ['literal', []]],
    }
    const fieldsHeight = ['coalesce', ['get', 'render_height'], ['get', 'height'], 7]
    map.addLayer({ ...fieldsBuilding, id: 'fields-facade', type: 'fill-extrusion', paint: {
      'fill-extrusion-color': '#405964', 'fill-extrusion-height': fieldsHeight,
      'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0],
      'fill-extrusion-vertical-gradient': true,
    } })
    map.addLayer({ ...fieldsBuilding, id: 'fields-roof', type: 'fill-extrusion', paint: {
      'fill-extrusion-color': '#9aa9a8', 'fill-extrusion-height': fieldsHeight, 'fill-extrusion-base': fieldsHeight,
    } })
    // Building parts in the vector tiles do not retain the mall's name. Select
    // only the stable IDs fully inside its sourced OSM footprint as tiles load.
    const fieldsIds = new Set()
    const updateFieldsFacade = () => {
      let changed = false
      for (const feature of map.querySourceFeatures('openmaptiles', { sourceLayer: 'building' })) {
        if (feature.id == null || feature.properties.hide_3d || !containsBuilding(fieldsFootprint, feature)) continue
        if (!fieldsIds.has(feature.id)) { fieldsIds.add(feature.id); changed = true }
      }
      if (!changed) return
      const filter = ['all', ['!=', ['get', 'hide_3d'], true], ['in', ['id'], ['literal', [...fieldsIds]]]]
      map.setFilter('fields-facade', filter)
      map.setFilter('fields-roof', filter)
    }
    map.on('sourcedata', event => { if (event.sourceId === 'openmaptiles' && event.isSourceLoaded) updateFieldsFacade() })
    map.on('idle', updateFieldsFacade)
    updateFieldsFacade()
    // Royal Arena's documented gold terracotta fins and glass base are
    // represented as material cues over its mapped building, not custom mesh.
    const arenaBuilding = { source: 'openmaptiles', 'source-layer': 'building', minzoom: 14,
      filter: ['in', ['id'], ['literal', []]],
    }
    const arenaHeight = ['coalesce', ['get', 'render_height'], ['get', 'height'], 7]
    map.addLayer({ ...arenaBuilding, id: 'royal-arena-facade', type: 'fill-extrusion', paint: {
      'fill-extrusion-color': '#b68c57', 'fill-extrusion-height': arenaHeight,
      'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0],
      'fill-extrusion-vertical-gradient': true,
    } })
    map.addLayer({ ...arenaBuilding, id: 'royal-arena-roof', type: 'fill-extrusion', paint: {
      'fill-extrusion-color': '#647d86', 'fill-extrusion-height': arenaHeight, 'fill-extrusion-base': arenaHeight,
    } })
    const arenaIds = new Set()
    const updateArenaFacade = () => {
      let changed = false
      for (const feature of map.querySourceFeatures('openmaptiles', { sourceLayer: 'building' })) {
        if (feature.id == null || feature.properties.hide_3d || !containsBuilding(royalArenaFootprint, feature)) continue
        if (!arenaIds.has(feature.id)) { arenaIds.add(feature.id); changed = true }
      }
      if (!changed) return
      const filter = ['all', ['!=', ['get', 'hide_3d'], true], ['in', ['id'], ['literal', [...arenaIds]]]]
      map.setFilter('royal-arena-facade', filter)
      map.setFilter('royal-arena-roof', filter)
    }
    map.on('sourcedata', event => { if (event.sourceId === 'openmaptiles' && event.isSourceLoaded) updateArenaFacade() })
    map.on('idle', updateArenaFacade)
    updateArenaFacade()
    map.addLayer({ id: 'brand-site-logo', type: 'symbol', source: 'brand-sites', minzoom: 15,
      layout: { 'icon-image': ['get', 'image'], 'icon-size': ['get', 'size'], 'icon-allow-overlap': true, 'icon-anchor': 'bottom', 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Bold'], 'text-size': 13, 'text-offset': [0, 1.2], 'text-anchor': 'top', 'text-allow-overlap': true },
      paint: { 'text-color': '#fff0c9', 'text-halo-color': '#06141e', 'text-halo-width': 2.5 },
    })
  } catch (error) {
    console.warn('Site logo unavailable', error)
  }
}
