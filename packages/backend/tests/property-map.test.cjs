const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
function load(relative, dependencies) {
  const source = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, relative), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const loaded = { exports: {} }
  new Function('require', 'module', 'exports', source)(id => dependencies[id] || {}, loaded, loaded.exports)
  return loaded.exports
}
const location = load('../src/utils/propertyLocation.ts', {})
test('map discovery covers the filtered search independently of pagination and protects approximate addresses', async () => {
  let query
  const counts = []
  const { propertyService } = load('../src/services/property.service.ts', {
    '@/utils/propertyLocation': location,
    '@/lib/prisma': { prisma: { property: {
      findMany: async args => { query = args; return [{ id: 'residential', isExclusive: false, locationMode: 'RADIUS', address: 'Private street', latitude: -17.39, longitude: -66.15 }] },
      count: async args => { counts.push(args); return args.where.latitude ? 25 : 27 },
    } } },
  })
  const result = await propertyService.searchProperties({ mapView: true, page: 3, pageSize: 12, type: 'RESIDENTIAL', city: ' Cochabamba ', operation: 'RENTAL', currency: 'BOB', priceMin: 0, priceMax: 1500.5, areaMin: 40 })
  assert.equal(query.skip, undefined)
  assert.equal(query.take, 2000)
  assert.equal(query.where.status, 'AVAILABLE')
  assert.equal(query.where.type, 'RESIDENTIAL')
  assert.equal(query.where.operation, 'RENTAL')
  assert.equal(query.where.currency, 'BOB')
  assert.deepEqual(query.where.city, { contains: 'Cochabamba', mode: 'insensitive' })
  assert.deepEqual(query.where.price, { gte: 0, lte: 1500.5 })
  assert.deepEqual(query.where.areaSquareMeters, { gte: 40 })
  assert.deepEqual(query.where.latitude, { not: null, gte: -85, lte: 85 })
  assert.equal(counts[0].where.latitude, undefined)
  assert.equal(result.total, 27)
  assert.equal(result.locatedTotal, 25)
  assert.equal(result.properties[0].address, 'Zona aproximada')
  assert.equal(query.select.advisor, undefined)
})
