import * as maplibregl from 'maplibre-gl'
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'
import './style.css'
import { routeStops, routePosition, totalDistance, infrastructure, platforms, tunnels } from './route.js'
import { addBrandSites, addLandmarks, places } from './landmarks.js'
import { createRide, advanceRide, playbackRate } from './ride.js'

// MapLibre 6 ships a separate worker. Give Vite its URL so vector and GeoJSON
// sources work in both the dev server and the production bundle.
maplibregl.setWorkerUrl(mapWorkerUrl)

// Station stories; mapped stop positions and journey distances come from OSM below.
const stations = [
  ['Vanløse', 'The western gateway — where the green line begins.'], ['Flintholm', 'A high interchange above the city.'], ['Lindevang', 'Quiet streets, tree crowns, and low rooftops.'], ['Fasanvej', 'The line folds into Frederiksberg.'], ['Frederiksberg', 'A wide square at the heart of the borough.'], ['Forum', 'Beneath the old Forum arena.'], ['Nørreport', 'Copenhagen’s busiest interchange.'], ['Kongens Nytorv', 'The royal square, Nyhavn, and the harbour.'], ['Christianshavn', 'Canals and centuries of brick facades.'], ['Islands Brygge', 'The harbour opens out to the south.'], ['DR Byen', 'Broadcast city meets the university campus.'], ['Sundby', 'A neighbourhood pause before Ørestad.'], ['Bella Center', 'Big skies and exhibition halls.'], ['Ørestad', 'Glass towers rise beside the elevated line.'], ['Vestamager', 'The city dissolves into the wide Amager landscape.'],
]
stations.forEach((station, index) => { station[2] = routeStops[index].progress; station[3] = routeStops[index].coordinates })
const stopDistances = routeStops.map(stop => stop.progress * totalDistance)
let ride = createRide(0, stopDistances)
const progress = document.querySelector('#progress'), stationName = document.querySelector('#station-name'), stationDetail = document.querySelector('#station-detail'), distance = document.querySelector('#distance'), stationList = document.querySelector('#station-list'), toggle = document.querySelector('#tour-toggle'), followToggle = document.querySelector('#follow-toggle')
let position = 0, heldDirection = 0, travelDirection = 1, autoRide = false, following = true, lastTime = performance.now(), mapReady = false, trainMarker
const map = new maplibregl.Map({
  container: 'map', center: stations[0][3], zoom: 16.2, pitch: 64, bearing: -25, maxPitch: 78,
  attributionControl: true, canvasContextAttributes: { antialias: true },
  // Keep the crisp OSM base; vector footprints provide citywide 3D buildings.
  style: {
    version: 8,
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: {
      osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap contributors' },
    },
    layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#12323a' } }, { id: 'osm', type: 'raster', source: 'osm', paint: { 'raster-saturation': -.15, 'raster-contrast': 0 } }],
  },
})
map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left')
stations.forEach(([name], index) => { const item = document.createElement('li'); item.innerHTML = `<button type="button"><span class="station-dot"></span>${name}</button>`; item.querySelector('button').addEventListener('click', () => { stopAutoRide(); setPosition(stations[index][2], true) }); stationList.append(item) })
function interpolateCoordinate(t) { return routePosition(t).coordinates }
function activeStation() { return stations.reduce((best, station, index) => { const delta = Math.abs(position - station[2]); return delta < best.delta ? { index, delta } : best }, { index: 0, delta: Infinity }).index }
function followTrain(fly = false) {
  if (!mapReady) return
  const center = interpolateCoordinate(position)
  if (fly) map.flyTo({ center, zoom: 16.2, pitch: 64, bearing: -25, essential: true, duration: 700 })
  else map.jumpTo({ center, zoom: Math.max(map.getZoom(), 15.5), pitch: 64, bearing: -25 })
}
function setPosition(next, fly = false) { const bounded = Math.max(0, Math.min(1, next)); if (!autoRide && bounded !== position) travelDirection = Math.sign(bounded - position); position = bounded; progress.value = String(Math.round(position * 1400)); updateUi(); if (!mapReady) return; const coordinate = interpolateCoordinate(position); trainMarker?.setLngLat(coordinate); if (fly || following) followTrain(fly) }
function updateUi() {
  const active = autoRide && ride.dwell === 0 && !ride.done ? ride.nextStop : activeStation()
  const [name, detail] = stations[active]
  if (stationName.textContent !== name) stationName.textContent = name
  if (stationDetail.textContent !== detail) stationDetail.textContent = detail
  document.querySelector('.eyebrow').textContent = autoRide ? (ride.dwell > 0 ? 'AT STATION' : 'NEXT STATION') : 'M1 JOURNEY'
  const section = { tunnel: 'Underground · dot shown at surface', elevated: 'Elevated track', surface: 'Surface track' }[routePosition(position).kind]
  const motion = autoRide ? (ride.dwell > 0 ? `Station stop · ${Math.ceil(ride.dwell / playbackRate)}s` : `${Math.round(ride.speed * 3.6)} km/h · ${playbackRate}× playback`) : (heldDirection ? 'Manual ride' : 'Paused')
  const destination = travelDirection === 1 ? 'Vestamager' : 'Vanløse'
  document.querySelector('#ride-status').textContent = `${motion} · Towards ${destination} · ${section}`
  distance.textContent = `${(position * totalDistance / 1000).toFixed(1)} / ${(totalDistance / 1000).toFixed(1)} KM`
  stationList.querySelectorAll('li').forEach((node, index) => node.classList.toggle('active', index === active))
}
function addM1Layers() {
  const trainPin = document.createElement('div'); trainPin.className = 'train-pin'; trainPin.innerHTML = '<span>M1</span>'
  trainMarker = new maplibregl.Marker({ element: trainPin, anchor: 'center' }).setLngLat(interpolateCoordinate(position)).addTo(map)
  map.setLight({ anchor: 'map', color: '#ffffff', intensity: .35, position: [1.5, 210, 50] })
  map.setSky({ 'sky-color': '#b4cfe0', 'horizon-color': '#edf2f3', 'fog-color': '#edf2f3', 'sky-horizon-blend': .7, 'horizon-fog-blend': .5, 'fog-ground-blend': .12 })
  map.addSource('openmaptiles', { type: 'vector', url: 'https://tiles.openfreemap.org/planet' })
  map.addLayer({
    id: 'm1-city-buildings', source: 'openmaptiles', 'source-layer': 'building', type: 'fill-extrusion', minzoom: 13,
    filter: ['!=', ['get', 'hide_3d'], true],
    paint: {
      // Broad OSM color words describe materials, not luminous CSS primaries.
      'fill-extrusion-color': ['match', ['get', 'colour'],
        'blue', '#647f91', 'red', '#a7624b', 'yellow', '#d3be85',
        'black', '#41464b', 'white', '#e4e1da', 'orange', '#ba7950', 'green', '#7b9281',
        ['to-color', ['get', 'colour'], '#c6c1b6']],
      'fill-extrusion-height': ['coalesce', ['get', 'render_height'], ['get', 'height'], 7],
      'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0],
      'fill-extrusion-opacity': 1,
      'fill-extrusion-vertical-gradient': true,
    },
  })
  addInfrastructure()
  addLandmarks(map)
  addBrandSites(map)
  mapReady = true
  const updateMapStatus = () => {
    document.querySelector('#map-status').textContent = map.querySourceFeatures('openmaptiles', { sourceLayer: 'building' }).length
      ? '3D buildings · mapped heights where available' : 'No 3D buildings in this view · zoom in to explore'
  }
  map.on('idle', updateMapStatus)
  map.on('sourcedata', event => { if (event.sourceId === 'openmaptiles' && event.isSourceLoaded) updateMapStatus() })
  map.on('error', event => {
    if (event.sourceId === 'openmaptiles') document.querySelector('#map-status').textContent = 'Building tiles unavailable · reload to retry'
  })
  followTrain(true)
}
if (map.isStyleLoaded()) addM1Layers()
else map.once('style.load', addM1Layers)
function stopAutoRide() {
  autoRide = false
  ride.speed = 0
  toggle.textContent = 'Auto ride'
  toggle.setAttribute('aria-pressed', 'false')
}
function loop(now) {
  const elapsed = Math.min(40, now - lastTime)
  lastTime = now
  if (heldDirection) setPosition(position + heldDirection * elapsed / 1000 * 20 * playbackRate / totalDistance)
  else if (autoRide) {
    advanceRide(ride, elapsed / 1000 * playbackRate, stopDistances)
    setPosition(ride.distance / totalDistance)
    if (ride.done) { stopAutoRide(); updateUi() }
  }
  requestAnimationFrame(loop)
}
window.addEventListener('keydown', event => {
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    if (event.target.matches('input, textarea, select') || event.repeat) return
    event.preventDefault()
    stopAutoRide()
    // Manual map exploration is allowed, but travelling always reacquires M1.
    following = true
    followToggle.textContent = 'Following train'
    followToggle.setAttribute('aria-pressed', 'true')
    heldDirection = event.key === 'ArrowRight' ? 1 : -1
    travelDirection = heldDirection
    setPosition(position + heldDirection * .001 * playbackRate, true)
  }
})
window.addEventListener('keyup', event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { heldDirection = 0; updateUi() } })
progress.addEventListener('input', () => { stopAutoRide(); setPosition(Number(progress.value) / 1400) })
toggle.addEventListener('click', () => {
  autoRide = !autoRide
  toggle.textContent = autoRide ? 'Pause ride' : 'Auto ride'
  toggle.setAttribute('aria-pressed', String(autoRide))
  if (autoRide) {
    // Starting at a terminus heads back along the line, without teleporting.
    if (position >= 1) travelDirection = -1
    else if (position <= 0) travelDirection = 1
    ride = createRide(position * totalDistance, stopDistances, travelDirection)
    following = true
    followToggle.textContent = 'Following train'
    followToggle.setAttribute('aria-pressed', 'true')
    followTrain(true)
  } else ride.speed = 0
  updateUi()
})
updateUi(); requestAnimationFrame(loop)
map.on('dragstart', () => { following = false; followToggle.textContent = 'Follow train'; followToggle.setAttribute('aria-pressed', 'false') })
followToggle.addEventListener('click', () => { following = !following; followToggle.textContent = following ? 'Following train' : 'Follow train'; followToggle.setAttribute('aria-pressed', String(following)); if (following) { updateUi(); followTrain(true) } })

function addInfrastructure() {
  map.addSource('metro-structure', { type: 'geojson', data: infrastructure })
  map.addSource('metro-stations', { type: 'geojson', data: platforms })
  map.addSource('metro-tunnels', { type: 'geojson', data: tunnels })
  map.addLayer({ id: 'metro-tunnels', type: 'line', source: 'metro-tunnels', paint: { 'line-color': '#526969', 'line-width': 3, 'line-dasharray': [2, 2], 'line-opacity': .75 } })
  map.addLayer({ id: 'metro-structure', type: 'fill-extrusion', source: 'metro-structure', paint: {
    'fill-extrusion-color': ['match', ['get', 'kind'], 'rail', '#526969', '#e2e5d9'],
    'fill-extrusion-base': ['get', 'base'], 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-vertical-gradient': true,
  } })
  map.addLayer({ id: 'metro-stations', type: 'fill-extrusion', source: 'metro-stations', paint: {
    'fill-extrusion-color': '#a6cebd', 'fill-extrusion-base': ['get', 'base'], 'fill-extrusion-height': ['get', 'height'],
    'fill-extrusion-opacity': .94,
  } })
  routeStops.forEach((stop, index) => {
    const button = document.createElement('button')
    button.className = 'map-station'
    button.type = 'button'
    button.textContent = stop.name
    button.setAttribute('aria-label', `Ride to ${stop.name}`)
    button.addEventListener('click', () => { stopAutoRide(); setPosition(stop.progress, true) })
    new maplibregl.Marker({ element: button, anchor: 'bottom', offset: [0, -24] }).setLngLat(stop.coordinates).addTo(map)
  })
}
const structureToggle = document.querySelector('#structure-toggle')
structureToggle.addEventListener('click', () => {
  if (!mapReady) return
  const visible = structureToggle.getAttribute('aria-pressed') !== 'true'
  structureToggle.setAttribute('aria-pressed', String(visible))
  for (const id of ['metro-structure', 'metro-stations', 'metro-tunnels']) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none')
  document.querySelectorAll('.map-station').forEach(marker => { marker.hidden = !visible })
})
document.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => {
  stopAutoRide()
  travelDirection = Number(button.dataset.step)
  following = true
  followToggle.textContent = 'Following train'
  followToggle.setAttribute('aria-pressed', 'true')
  setPosition(position + Number(button.dataset.step) * .003 * playbackRate, true)
}))
window.addEventListener('blur', () => { heldDirection = 0 })

const landmarkSelect = document.querySelector('#landmark-select')
places.forEach((place, index) => {
  const option = document.createElement('option')
  option.value = String(index)
  option.textContent = place.name
  landmarkSelect.append(option)
})
landmarkSelect.addEventListener('change', () => {
  if (!mapReady || landmarkSelect.value === '') return
  const place = places[Number(landmarkSelect.value)]
  stopAutoRide()
  heldDirection = 0
  following = false
  followToggle.textContent = 'Follow train'
  followToggle.setAttribute('aria-pressed', 'false')
  stationName.textContent = place.name
  stationDetail.textContent = 'Mapped building model. Use Follow train to return to the metro.'
  document.querySelector('.eyebrow').textContent = 'LANDMARK VIEW'
  document.querySelector('#ride-status').textContent = 'Ride paused'
  map.flyTo({ center: place.center, zoom: 18, pitch: 64, bearing: -25, duration: 1300 })
})
