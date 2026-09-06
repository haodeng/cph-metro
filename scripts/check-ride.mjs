import assert from 'node:assert/strict'
import { createRide, advanceRide, cruiseSpeed, playbackRate } from '../src/ride.js'
import { routeStops, totalDistance } from '../src/route.js'

const stops = routeStops.map(stop => stop.progress * totalDistance)
for (const direction of [1, -1]) {
  const start = direction === 1 ? 0 : totalDistance
  const end = direction === 1 ? totalDistance : 0
  const ride = createRide(start, stops, direction), visited = new Set([direction === 1 ? 0 : 14])
  for (let frame = 0; frame < 100000 && !ride.done; frame++) {
    const previous = { ...ride }
    advanceRide(ride, .04 * playbackRate, stops)
    assert((ride.distance - previous.distance) * direction >= 0)
    assert(ride.distance >= 0 && ride.distance <= totalDistance)
    assert(ride.speed >= 0 && ride.speed <= cruiseSpeed)
    if (previous.dwell > 0) assert.equal(ride.distance, previous.distance)
    if (ride.nextStop !== previous.nextStop) {
      assert.equal(ride.distance, stops[previous.nextStop])
      assert.equal(ride.speed, 0)
      visited.add(previous.nextStop)
    }
  }
  assert(ride.done)
  assert.equal(visited.size, 15)
  assert.equal(ride.distance, end)
}
assert(createRide(0, stops, -1).done)
assert.equal(createRide(stops[4] + 20, stops, -1).nextStop, 4)
assert.equal(createRide(stops[4], stops, -1).nextStop, 3)
assert(createRide(totalDistance, stops).done)
assert.equal(createRide(stops[4] + 20, stops).nextStop, 5)
console.log('Ride: both directions respect speed limits, stop at all 15 stations, and finish without overshooting.')
