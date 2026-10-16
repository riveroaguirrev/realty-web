const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const source = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/utils/propertyMap.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
const loaded = { exports: {} }
const locationSource = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/utils/searchLocation.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
const locations = { exports: {} }
new Function('module', 'exports', locationSource)(locations, locations.exports)
new Function('require', 'module', 'exports', source)(id => { if (id === './searchLocation') return locations.exports; throw new Error(id) }, loaded, loaded.exports)
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

test('selected Mapbox areas retain their bounds across reloads, invalid and partial boxes are discarded', () => {
  const query = new URLSearchParams('location=Cochabamba&west=-66.3&south=-17.5&east=-66&north=-17.2')
  assert.deepEqual(readMapFilters(query), { location: 'Cochabamba', west: -66.3, south: -17.5, east: -66, north: -17.2 })
  for (const bad of ['west=&south=-17.5&east=-66&north=-17.2', 'west=-66&south=-17.5&east=-67&north=-17.2', 'west=-200&south=-17.5&east=-66&north=-17.2', 'west=-66.3', 'west=NaN&south=-17.5&east=-66&north=-17.2']) {
    assert.deepEqual(readMapFilters(new URLSearchParams(`location=Test&${bad}`)), {})
  }
})
test('Mapbox neighborhood search uses its bbox or a geographic fallback around the center', () => {
  const { boundsForPlace, validSearchBounds } = locations.exports
  assert.deepEqual(boundsForPlace({ center: [-66.15, -17.39], bbox: [-66.2, -17.4, -66.1, -17.3] }), { west: -66.2, south: -17.4, east: -66.1, north: -17.3 })
  const result = boundsForPlace({ center: [-66.15, -17.39], place_type: ['neighborhood'] })
  assert.equal(validSearchBounds(result), true)
  assert.ok(result.west < -66.15 && result.east > -66.15 && result.south < -17.39 && result.north > -17.39)
})
