const cattle = [
  [12.5827, 55.64615, 18], [12.58312, 55.64658, -12], [12.5837, 55.64628, 43],
  [12.58405, 55.64683, -34], [12.58442, 55.64644, 8],
]

function cattleIcon() {
  const canvas = document.createElement('canvas')
  canvas.width = 80
  canvas.height = 56
  const context = canvas.getContext('2d')
  context.fillStyle = 'rgba(16, 35, 28, .25)'
  context.beginPath()
  context.ellipse(38, 42, 29, 6, 0, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = '#f4ead5'
  context.beginPath()
  context.roundRect(12, 16, 42, 24, 11)
  context.fill()
  context.fillStyle = '#5b3825'
  context.beginPath()
  context.ellipse(28, 26, 9, 7, -.35, 0, Math.PI * 2)
  context.ellipse(45, 33, 7, 5, .2, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = '#f4ead5'
  context.beginPath()
  context.roundRect(51, 19, 17, 15, 6)
  context.fill()
  context.fillStyle = '#5b3825'
  context.fillRect(18, 37, 5, 10)
  context.fillRect(44, 37, 5, 10)
  context.fillRect(58, 30, 4, 11)
  context.strokeStyle = '#5b3825'
  context.lineWidth = 3
  context.beginPath()
  context.moveTo(13, 24)
  context.lineTo(5, 16)
  context.stroke()
  context.fillStyle = '#20170f'
  context.beginPath()
  context.arc(63, 24, 1.6, 0, Math.PI * 2)
  context.fill()
  return context.getImageData(0, 0, canvas.width, canvas.height)
}

export function addSundbyCattle(map) {
  map.addImage('sundby-cattle', cattleIcon(), { pixelRatio: 2 })
  map.addSource('sundby-cattle', { type: 'geojson', data: {
    type: 'FeatureCollection',
    features: cattle.map(([lon, lat, bearing]) => ({
      type: 'Feature', properties: { bearing }, geometry: { type: 'Point', coordinates: [lon, lat] },
    })),
  } })
  map.addLayer({ id: 'sundby-cattle', type: 'symbol', source: 'sundby-cattle', minzoom: 14.5,
    layout: { 'icon-image': 'sundby-cattle', 'icon-size': .72, 'icon-rotate': ['get', 'bearing'], 'icon-rotation-alignment': 'map', 'icon-pitch-alignment': 'map', 'icon-allow-overlap': true, 'icon-ignore-placement': true },
  })
}
