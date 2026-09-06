const center = [12.60216, 55.67396]
const lights = [
  [12.60098, 55.67362, '#f9cb59'], [12.60135, 55.67418, '#ef7854'], [12.6018, 55.67342, '#f7d879'],
  [12.60222, 55.67451, '#f19d55'], [12.60272, 55.67377, '#f9cb59'], [12.60311, 55.67419, '#d96f57'],
  [12.60355, 55.67347, '#f7d879'], [12.60166, 55.67292, '#ef7854'], [12.60246, 55.67285, '#f9cb59'],
]

function treeCanopy() {
  const canvas = document.createElement('canvas')
  canvas.width = 44
  canvas.height = 44
  const context = canvas.getContext('2d')
  context.fillStyle = '#2f5f3d'
  context.beginPath()
  context.arc(22, 22, 15, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = '#5f8d4d'
  context.beginPath()
  context.arc(17, 17, 10, 0, Math.PI * 2)
  context.arc(28, 23, 9, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = 'rgba(218, 235, 145, .45)'
  context.beginPath()
  context.arc(17, 16, 5, 0, Math.PI * 2)
  context.fill()
  return context.getImageData(0, 0, canvas.width, canvas.height)
}

export function addChristianiaLife(map) {
  map.addSource('christiania-life', { type: 'geojson', data: {
    type: 'FeatureCollection', features: lights.map(([lon, lat, color]) => ({
      type: 'Feature', properties: { color }, geometry: { type: 'Point', coordinates: [lon, lat] },
    })),
  } })
  map.addLayer({ id: 'christiania-lights', type: 'circle', source: 'christiania-life', minzoom: 14,
    paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 14, 2, 16, 4], 'circle-color': ['get', 'color'], 'circle-opacity': .9, 'circle-blur': .15, 'circle-stroke-color': '#fff0c9', 'circle-stroke-width': .5 },
  })
  map.addImage('christiania-canopy', treeCanopy(), { pixelRatio: 2 })
  map.addSource('christiania-canopies', { type: 'geojson', data: {
    type: 'FeatureCollection', features: [
      [12.60104, 55.67431], [12.60152, 55.67327], [12.60221, 55.67348], [12.60278, 55.67402], [12.60342, 55.67303],
    ].map(coordinates => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates } })),
  } })
  map.addLayer({ id: 'christiania-canopies', type: 'symbol', source: 'christiania-canopies', minzoom: 14,
    layout: { 'icon-image': 'christiania-canopy', 'icon-size': .7, 'icon-allow-overlap': true, 'icon-ignore-placement': true, 'icon-pitch-alignment': 'map' },
  })
  map.addSource('christiania-label', { type: 'geojson', data: {
    type: 'FeatureCollection', features: [{ type: 'Feature', properties: { name: 'CHRISTIANIA' }, geometry: { type: 'Point', coordinates: center } }],
  } })
  map.addLayer({ id: 'christiania-label', type: 'symbol', source: 'christiania-label', minzoom: 13,
    layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Bold'], 'text-size': 13, 'text-letter-spacing': .14, 'text-offset': [0, -2.7], 'text-anchor': 'bottom', 'text-allow-overlap': true },
    paint: { 'text-color': '#ffe071', 'text-halo-color': '#213421', 'text-halo-width': 2 },
  })
}
