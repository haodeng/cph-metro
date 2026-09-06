import data from './data/m1.json' with { type: 'json' }

const metresLat = 111320, metresLon = metresLat * Math.cos(55.66 * Math.PI / 180)
const length = (a, b) => Math.hypot((b[0] - a[0]) * metresLon, (b[1] - a[1]) * metresLat)
const coordinates = [], kinds = []
for (const way of data.ways) {
  for (let i = 0; i < way.coordinates.length - 1; i++) {
    coordinates.push(way.coordinates[i])
    kinds.push(way.kind)
  }
}
coordinates.push(data.ways.at(-1).coordinates.at(-1))
const stopIndices = data.stops.map(stop => coordinates.reduce((best, point, index) =>
  length(point, stop.coordinates) < length(coordinates[best], stop.coordinates) ? index : best, 0))
const points = coordinates.slice(stopIndices[0], stopIndices.at(-1) + 1)
const sections = kinds.slice(stopIndices[0], stopIndices.at(-1))
const distances = [0]
points.slice(1).forEach((point, i) => distances.push(distances[i] + length(points[i], point)))
export const totalDistance = distances.at(-1)
export const routeStops = data.stops.map((stop, i) => ({ ...stop, progress: distances[stopIndices[i] - stopIndices[0]] / totalDistance }))

export function routePosition(t) {
  const target = Math.max(0, Math.min(1, t)) * totalDistance
  let index = distances.findIndex(d => d > target) - 1
  if (index < 0) index = points.length - 2
  const a = points[index], b = points[index + 1]
  const ratio = (target - distances[index]) / (distances[index + 1] - distances[index])
  return { coordinates: a.map((value, axis) => value + (b[axis] - value) * ratio), kind: sections[index], a, b }
}

// Schematic cross sections, in metres. OSM supplies horizontal alignment and
// tunnel/bridge classification, not surveyed deck heights or platform dimensions.
function rectangle(a, b, width, base, height, kind) {
  const dx = (b[0] - a[0]) * metresLon, dy = (b[1] - a[1]) * metresLat
  const distance = Math.hypot(dx, dy)
  const x = -dy / distance * width / 2 / metresLon, y = dx / distance * width / 2 / metresLat
  const ring = [[a[0] + x, a[1] + y], [a[0] - x, a[1] - y], [b[0] - x, b[1] - y], [b[0] + x, b[1] + y]]
  return { type: 'Feature', properties: { base, height, kind }, geometry: { type: 'Polygon', coordinates: [[...ring, ring[0]]] } }
}
export const infrastructure = { type: 'FeatureCollection', features: points.slice(1).flatMap((b, i) => {
  if (sections[i] === 'tunnel') return []
  const base = sections[i] === 'elevated' ? 7 : 0
  return [rectangle(points[i], b, 4.2, base, base + 1.2, 'track'), rectangle(points[i], b, 1.435, base + 1.2, base + 1.4, 'rail')]
}) }
export const tunnels = { type: 'FeatureCollection', features: points.slice(1).flatMap((b, i) => sections[i] === 'tunnel'
  ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [points[i], b] } }] : []) }
export const platforms = { type: 'FeatureCollection', features: routeStops.map((stop, index) => {
  const { a, b, kind } = routePosition(stop.progress)
  const scale = 35 / length(a, b), c = stop.coordinates
  const start = c.map((value, axis) => value - (b[axis] - a[axis]) * scale)
  const end = c.map((value, axis) => value + (b[axis] - a[axis]) * scale)
  const base = kind === 'elevated' ? 7 : 0
  const feature = rectangle(start, end, 12, base, base + (kind === 'tunnel' ? 1 : 2.5), kind)
  feature.properties.index = index
  return feature
}) }
