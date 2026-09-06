import assert from 'node:assert/strict'
import { containsBuilding, places } from '../src/landmarks.js'

assert.equal(places.length, 6)
assert.equal(places.filter(place => place.material === 'brick').length, 2)
const tower = places.find(place => place.name === 'Rundetårn')
const [x, y] = tower.center
const geometry = { type: 'Polygon', coordinates: [[[x, y], [x + .00001, y], [x, y + .00001], [x, y]]] }
assert(containsBuilding(tower, { geometry }))
assert(containsBuilding(tower, { geometry: { type: 'MultiPolygon', coordinates: [geometry.coordinates] } }))
assert(!containsBuilding(tower, { geometry: { type: 'Point', coordinates: tower.center } }))
assert(!containsBuilding(tower, { geometry: { type: 'Polygon', coordinates: [[[x, y], [x + .001, y], [x, y]]] } }))
assert(!containsBuilding(tower, { geometry: { type: 'Polygon', coordinates: [] } }))
console.log('Landmarks: six sourced places; brick selection handles building parts and excludes neighbours.')
