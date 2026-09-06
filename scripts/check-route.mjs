import assert from 'node:assert/strict'
import { routeStops, routePosition, totalDistance, infrastructure, platforms, tunnels } from '../src/route.js'

assert.equal(routeStops.length, 15)
assert(totalDistance > 13000 && totalDistance < 14500)
for (const [index, stop] of routeStops.entries()) {
  if (index) assert(stop.progress > routeStops[index - 1].progress)
  routePosition(stop.progress).coordinates.forEach((value, axis) => assert(Math.abs(value - stop.coordinates[axis]) < 1e-8, `${stop.name} must lie on the ride path`))
}
assert.deepEqual(routePosition(-1).coordinates, routeStops[0].coordinates)
assert.deepEqual(routePosition(2).coordinates, routeStops.at(-1).coordinates)
assert.equal(routePosition(routeStops[7].progress).kind, 'tunnel')
assert.equal(routePosition(routeStops[10].progress).kind, 'elevated')
assert(tunnels.features.length > 0)
assert.equal(platforms.features.length, 15)
for (const feature of [...infrastructure.features, ...platforms.features]) {
  const ring = feature.geometry.coordinates[0]
  assert.deepEqual(ring[0], ring.at(-1))
  assert(ring.flat().every(Number.isFinite))
  assert(feature.properties.height > feature.properties.base)
}
console.log('M1 route: all stops on path, ordered distances, endpoints, tunnel/bridge classification and 3D polygons pass.')
