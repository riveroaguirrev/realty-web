const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const source = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/utils/propertyMap.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
const loaded = { exports: {} }
new Function('module', 'exports', source)(loaded, loaded.exports)
const { readMapFilters, inMapBounds, mapFeatureCollection } = loaded.exports

test('map starts with every property type, including residential listings', () => {
  assert.deepEqual(readMapFilters(new URLSearchParams()), {})
  assert.deepEqual(readMapFilters(new URLSearchParams('type=')), {})
  assert.equal(readMapFilters(new URLSearchParams('type=RESIDENTIAL')).type, 'RESIDENTIAL')
})
test('shared map filters retain zero, decimal budgets and operation, ignoring malformed numbers', () => {
  assert.deepEqual(readMapFilters(new URLSearchParams('operation=RENTAL&currency=BOB&priceMin=0&priceMax=1500.50&areaMin=invalid&areaMax=-3&bedroomsMin=')), { operation: 'RENTAL', currency: 'BOB', priceMin: 0, priceMax: 1500.5 })
})
test('visible-area filtering handles world wrap and the antimeridian', () => {
  assert.equal(inMapBounds({ longitude: -66.15, latitude: -17.39 }, { west: -67, east: -65, south: -18, north: -17 }), true)
  assert.equal(inMapBounds({ longitude: -66.15, latitude: -19 }, { west: -67, east: -65, south: -18, north: -17 }), false)
  assert.equal(inMapBounds({ longitude: -175, latitude: 0 }, { west: 170, east: 190, south: -5, north: 5 }), true)
  assert.equal(inMapBounds({ longitude: 0, latitude: 0 }, { west: 170, east: 190, south: -5, north: 5 }), false)
  assert.equal(inMapBounds({ longitude: 0, latitude: 0 }, { west: -200, east: 200, south: -5, north: 5 }), true)
})
test('map features use public coordinates and no addresses or contact details', () => {
  const data = mapFeatureCollection([{ id: 'test', latitude: -17, longitude: -66, price: 1000, currency: 'BOB', address: 'Private', phone: 'Private' }])
  assert.deepEqual(data.features[0].geometry.coordinates, [-66, -17])
  assert.equal(data.features[0].properties.id, 'test')
  assert.equal(JSON.stringify(data).includes('Private'), false)
})
