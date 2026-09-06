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
    document.querySelector('#landmark-note').textContent = 'Landmark names available. Brick texture could not load; reload to retry.'
    console.warn('Landmark texture unavailable', error)
  }
}
