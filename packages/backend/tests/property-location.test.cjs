const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

// Compile the actual TS modules without adding a runtime dependency to the app.
function loadTS(relative) {
  const filename = path.resolve(__dirname, relative)
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', source)(id =>
    id === '@shared/types' ? loadTS('../../shared/src/types/index.ts') : require(id), module, module.exports)
  return module.exports
}
const { validatePropertyInput } = loadTS('../src/utils/validators.ts')
const { publicPropertyLocation } = loadTS('../src/utils/propertyLocation.ts')
const valid = { title: 'Casa de prueba', address: 'Dirección privada', city: 'Cochabamba', region: 'Cochabamba', type: 'HOUSE', price: 100000, images: [], latitude: -17.3935, longitude: -66.157, isExclusive: false, locationMode: 'RADIUS', locationRadiusMeters: 500 }

test('exclusive listings allow both exact pins and radius areas', () => {
  for (const locationMode of ['EXACT', 'RADIUS']) {
    assert.equal(validatePropertyInput({ ...valid, isExclusive: true, locationMode }).isValid, true)
  }
})
test('non-exclusive listings cannot bypass radius-only mode through the API', () => {
  assert.equal(validatePropertyInput({ ...valid, locationMode: 'EXACT' }).isValid, false)
  assert.equal(validatePropertyInput({ ...valid, isExclusive: 'true', locationMode: 'EXACT' }).isValid, false)
  assert.equal(validatePropertyInput(valid).isValid, true)
})
test('radius limits and coordinate pairs are validated', () => {
  for (const radius of [0, 99, 5001, 100.5, '500', Infinity]) {
    assert.equal(validatePropertyInput({ ...valid, locationRadiusMeters: radius }).isValid, false)
  }
  for (const point of [{latitude: 86}, {longitude: 181}, {latitude: NaN}, {longitude: null}, {latitude: '0'}]) {
    assert.equal(validatePropertyInput({ ...valid, ...point }).isValid, false)
  }
  for (const radius of [100, 5000]) assert.equal(validatePropertyInput({ ...valid, locationRadiusMeters: radius }).isValid, true)
  assert.equal(validatePropertyInput({ ...valid, latitude: 0, longitude: 0 }).isValid, true)
  assert.equal(validatePropertyInput({ ...valid, locationMode: 'OTHER' }).isValid, false)
})
test('legacy listings without a location can still be edited by older clients', () => {
  const { isExclusive, locationMode, locationRadiusMeters, latitude, longitude, ...legacy } = valid
  const result = validatePropertyInput(legacy)
  assert.equal(result.isValid, true)
  assert.equal(result.data.locationMode, 'RADIUS')
  assert.equal(result.data.latitude, null)
})
test('radius listings hide address and external map links for every exclusivity state', () => {
  for (const isExclusive of [true, false]) {
    const original = { ...valid, isExclusive, mapUrl: 'https://maps.example/private', zipCode: '1234' }
    const result = publicPropertyLocation(original)
    assert.equal(result.address, 'Zona aproximada')
    assert.equal(result.mapUrl, null)
    assert.equal(result.zipCode, null)
    assert.equal(result.latitude, original.latitude)
    assert.equal(original.address, 'Dirección privada')
  }
})
test('exact address is visible only for exclusive exact-mode listings', () => {
  assert.equal(publicPropertyLocation({ ...valid, isExclusive: true, locationMode: 'EXACT' }).address, valid.address)
  assert.equal(publicPropertyLocation({ ...valid, locationMode: 'EXACT' }).address, 'Zona aproximada')
})
