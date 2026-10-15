const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

function loadUtility(name) {
  const source = fs.readFileSync(path.resolve(__dirname, `../src/utils/${name}.ts`), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const module = { exports: {} }
  new Function('module', 'exports', compiled)(module, module.exports)
  return module.exports
}
const { mapboxAddress } = loadUtility('mapboxAddress')
const { imageCrop } = loadUtility('imageCrop')

test('reads address, neighborhood and city from the v5 hierarchy', () => {
  assert.deepEqual(mapboxAddress([{ id: 'address.1', text: 'Calle Test', address: '123', place_type: ['address'], context: [{ id: 'neighborhood.1', text: 'Barrio Test' }, { id: 'place.1', text: 'Cochabamba' }] }]), { address: 'Calle Test 123', neighborhood: 'Barrio Test', city: 'Cochabamba' })
})
test('reads a neighborhood from v6 context even when it is not a separate feature', () => {
  assert.deepEqual(mapboxAddress([{ properties: { feature_type: 'address', name: 'Calle Test 123', context: { neighborhood: { name: 'Barrio Test' }, place: { name: 'Cochabamba' } } } }]), { address: 'Calle Test 123', neighborhood: 'Barrio Test', city: 'Cochabamba' })
})
test('uses locality as the zone and a street when no house number is available', () => {
  assert.deepEqual(mapboxAddress([{ properties: { feature_type: 'street', name: 'Calle Test', context: { locality: { name: 'Zona Test' }, place: { name: 'La Paz' } } } }]), { address: 'Calle Test', neighborhood: 'Zona Test', city: 'La Paz' })
})
test('does not mistake the city or department for a neighborhood', () => {
  assert.deepEqual(mapboxAddress([{ id: 'place.1', text: 'La Paz', place_type: ['place'], context: [{ id: 'locality.1', text: 'La Paz' }, { id: 'region.1', text: 'Departamento de La Paz' }] }]), { address: '', neighborhood: '', city: 'La Paz' })
  assert.deepEqual(mapboxAddress([]), { address: '', neighborhood: '', city: '' })
})
test('keeps the selected neighborhood from a forward search result', () => {
  assert.equal(mapboxAddress([{ id: 'neighborhood.1', text: 'Barrio Test', place_type: ['neighborhood'], context: [{ id: 'place.1', text: 'Cochabamba' }] }]).neighborhood, 'Barrio Test')
})
test('centers a landscape crop without stretching the photo', () => {
  const crop = imageCrop(1200, 800, 16 / 9, 1, 50, 50)
  assert.deepEqual(crop, { x: 0, y: 62.5, width: 1200, height: 675 })
})
test('zoom and edge movement stay inside the source image', () => {
  for (const aspect of [16 / 9, 4 / 3, 1]) {
    for (const dimensions of [[1200, 800], [800, 1200]]) {
      for (const zoom of [1, 1.7, 3]) {
        for (const position of [[0, 0], [100, 100], [-20, 130]]) {
          const crop = imageCrop(...dimensions, aspect, zoom, ...position)
          assert.ok(crop.x >= 0 && crop.y >= 0)
          assert.ok(crop.x + crop.width <= dimensions[0] + 1e-6)
          assert.ok(crop.y + crop.height <= dimensions[1] + 1e-6)
          assert.ok(Math.abs(crop.width / crop.height - aspect) < 1e-6)
        }
      }
    }
  }
})
