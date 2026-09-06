// A paced simulation, not live operations or a timetable. Distances are metres,
// speed is m/s; acceleration and short station pauses are illustrative.
export const cruiseSpeed = 20
export const playbackRate = 6
const acceleration = .9, braking = 1.1, stationPause = 8

export function createRide(distance, stops, direction = 1) {
  const nextStop = direction === 1
    ? stops.findIndex(stop => stop > distance + .1)
    : stops.findLastIndex(stop => stop < distance - .1)
  return { distance, direction, speed: 0, nextStop, dwell: stops.some(stop => Math.abs(stop - distance) < .1) ? stationPause : 0, done: nextStop === -1 }
}

export function advanceRide(ride, seconds, stops) {
  if (ride.done) return
  if (ride.dwell > 0) {
    ride.dwell = Math.max(0, ride.dwell - seconds)
    return
  }
  const remaining = (stops[ride.nextStop] - ride.distance) * ride.direction
  const desired = Math.min(cruiseSpeed, Math.sqrt(2 * braking * Math.max(0, remaining)))
  const previousSpeed = ride.speed
  ride.speed = desired > ride.speed
    ? Math.min(desired, ride.speed + acceleration * seconds)
    : Math.max(desired, ride.speed - braking * seconds)
  const travel = (previousSpeed + ride.speed) / 2 * seconds
  if (remaining <= Math.max(.05, travel)) {
    ride.distance = stops[ride.nextStop]
    ride.speed = 0
    ride.dwell = stationPause
    ride.nextStop += ride.direction
    ride.done = ride.nextStop < 0 || ride.nextStop >= stops.length
  } else ride.distance += travel * ride.direction
}
