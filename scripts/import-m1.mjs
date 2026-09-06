// Refresh from Overpass: rel(152202);(._;>;);out body geom;
// Usage: node scripts/import-m1.mjs /path/to/overpass.json
import fs from 'node:fs'
import assert from 'node:assert/strict'

const { elements } = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const relation = elements.find(e => e.type === 'relation' && e.id === 152202)
const lookup = new Map(elements.map(e => [`${e.type}/${e.id}`, e]))
const stops = relation.members.filter(m => m.role === 'stop').map(m => lookup.get(`node/${m.ref}`))
let previous = [stops[0].lon, stops[0].lat]
const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])
const ways = relation.members.filter(m => m.type === 'way' && !m.role).map((m, index) => {
  const way = lookup.get(`way/${m.ref}`)
  const coordinates = way.geometry.map(p => [p.lon, p.lat])
  if (near(previous, coordinates.at(-1)) < near(previous, coordinates[0])) coordinates.reverse()
  if (index) assert(near(previous, coordinates[0]) < .000001, `Disconnected way ${way.id}`)
  previous = coordinates.at(-1)
  return { id: way.id, kind: way.tags.tunnel === 'yes' ? 'tunnel' : way.tags.bridge && way.tags.bridge !== 'no' ? 'elevated' : 'surface', coordinates }
})
assert.equal(stops.length, 15)
const data = {
  source: 'https://www.openstreetmap.org/relation/152202',
  license: 'OpenStreetMap contributors · ODbL 1.0',
  retrieved: new Date().toISOString().slice(0, 10),
  stops: stops.map(s => ({ name: s.tags.name, coordinates: [s.lon, s.lat] })),
  ways,
}
fs.writeFileSync(new URL('../src/data/m1.json', import.meta.url), JSON.stringify(data))
console.log(`Saved ${stops.length} stops and ${ways.length} connected track ways.`)
