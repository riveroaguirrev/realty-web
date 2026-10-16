const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const compiled = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/utils/propertyWizard.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
const loaded = { exports: {} }
new Function('module', 'exports', compiled)(loaded, loaded.exports)
const { validatePropertyStep } = loaded.exports
const valid = { title: 'Departamento demo', price: 85000, commissionPercentage: 3, address: 'Dirección demo', city: 'Cochabamba', region: 'Cala Cala', latitude: -17.37, longitude: -66.17, bedrooms: 2, bathrooms: 2, areaSquareMeters: 92.5, isExclusive: false, locationMode: 'RADIUS', locationRadiusMeters: 500 }

test('information step allows advancing before location and photos have been entered', () => {
  assert.equal(validatePropertyStep(0, { ...valid, address: '', city: '', region: '', latitude: null, longitude: null }, 0), null)
  assert.equal(validatePropertyStep(0, { ...valid, title: '  ' }, 0).field, 'property-title')
  for (const price of [0, -5, Infinity, NaN]) assert.equal(validatePropertyStep(0, { ...valid, price }, 0).field, 'property-price')
  assert.ok(validatePropertyStep(0, { ...valid, commissionPercentage: 101 }, 0))
})
test('location step requires address fields, a coordinate pair and valid public location rules', () => {
  assert.equal(validatePropertyStep(1, valid, 0), null)
  for (const field of ['address', 'city', 'region']) assert.ok(validatePropertyStep(1, { ...valid, [field]: ' ' }, 0))
  for (const point of [{ latitude: null }, { longitude: null }, { latitude: 86 }, { longitude: Infinity }]) assert.ok(validatePropertyStep(1, { ...valid, ...point }, 0))
  assert.ok(validatePropertyStep(1, { ...valid, locationMode: 'EXACT' }, 0))
  assert.equal(validatePropertyStep(1, { ...valid, isExclusive: true, locationMode: 'EXACT' }, 0), null)
  assert.ok(validatePropertyStep(1, { ...valid, bedrooms: 1.5 }, 0))
  assert.ok(validatePropertyStep(1, { ...valid, areaSquareMeters: -1 }, 0))
})
test('photos are optional but the wizard rejects more than twenty before uploading', () => {
  assert.equal(validatePropertyStep(2, valid, 0), null)
  assert.equal(validatePropertyStep(2, valid, 20), null)
  assert.ok(validatePropertyStep(2, valid, 21))
})
