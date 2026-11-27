const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const compiled = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/utils/requirementWizard.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText
const loaded = { exports: {} }
new Function('module', 'exports', compiled)(loaded, loaded.exports)
const { validateRequirementStep: validate } = loaded.exports
const valid = { title: 'Departamento para familia', description: '', cities: ['Cochabamba'], zones: [], priceMin: null, priceMax: 4000, bedroomsMin: null, bathroomsMin: null, areaMin: null }

test('information can advance before location and budget, but requires a valid title', () => {
  assert.equal(validate(0, { ...valid, cities: [], priceMax: null }, false), null)
  for (const title of ['', '    ', 'Casa', 'a'.repeat(181)]) assert.equal(validate(0, { ...valid, title }, false).field, 'requirement-title')
  assert.equal(validate(0, { ...valid, description: 'x'.repeat(3001) }, false).field, 'requirement-description')
})
test('location and budget are checked before continuing or final publication', () => {
  assert.equal(validate(1, valid, false), null)
  assert.equal(validate(1, { ...valid, cities: [] }, false).field, 'requirement-city')
  assert.equal(validate(1, { ...valid, priceMax: null }, false).field, 'requirement-max')
  assert.equal(validate(1, { ...valid, priceMin: 5000 }, false).field, 'requirement-max')
  for (const amount of [-1, Infinity, NaN]) assert.equal(validate(1, { ...valid, priceMax: amount }, false).field, 'requirement-max')
  assert.equal(validate(1, { ...valid, cities: Array(13).fill('Ciudad') }, false).field, 'requirement-city')
})
test('open budget ignores hidden values while still requiring a city', () => {
  assert.equal(validate(1, { ...valid, priceMin: 5000, priceMax: 100 }, true), null)
  assert.equal(validate(1, { ...valid, priceMin: null, priceMax: null }, true), null)
  assert.equal(validate(1, { ...valid, cities: [] }, true).field, 'requirement-city')
})
test('optional features stay optional and zero bedrooms or bathrooms are valid', () => {
  assert.equal(validate(2, valid, false), null)
  assert.equal(validate(2, { ...valid, bedroomsMin: 0, bathroomsMin: 0 }, false), null)
  for (const count of [-1, 1.5, 101, NaN]) assert.equal(validate(2, { ...valid, bedroomsMin: count }, false).field, 'requirement-bedrooms')
  for (const area of [0, -1, Infinity]) assert.equal(validate(2, { ...valid, areaMin: area }, false).field, 'requirement-area')
})
