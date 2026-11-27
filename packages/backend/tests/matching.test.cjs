const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const base = {
  id: 'reference', type: 'APARTMENT', operation: 'SALE', currency: 'USD',
  price: 100000, city: 'Cochabamba', region: 'Cochabamba', bedrooms: 2,
  areaSquareMeters: 100, features: ['balcony', 'elevator'], status: 'AVAILABLE',
  visibility: 'PUBLIC',
}
const matchesWhere = (record, where) => Object.entries(where).every(([key, value]) => {
  if (key === 'AND') return value.every(part => matchesWhere(record, part))
  if (value && typeof value === 'object') {
    if ('not' in value) return record[key] !== value.not
    if ('in' in value) return value.in.includes(record[key])
  }
  return record[key] === value
})
async function recommend(reference, candidates, limit = 6, onFinalRead) {
  const reads = []
  const prisma = { property: {
    findFirst: async () => reference,
    findMany: async (query) => {
      reads.push(query)
      if (reads.length === 2 && onFinalRead) onFinalRead(candidates)
      return candidates.filter(record => matchesWhere(record, query.where))
    },
  } }
  const source = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/services/matching.service.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const mod = { exports: {} }
  new Function('require', 'module', 'exports', source)(id => {
    if (id === '@/lib/prisma') return { prisma }
    if (id === '@/utils/propertyView') return { propertyCardSelect: { id: true } }
    throw new Error('Unexpected import: ' + id)
  }, mod, mod.exports)
  const results = await mod.exports.MatchingService.getSimilarPropertiesWithDetails('reference', { visibility: 'PUBLIC' }, limit)
  return { results, reads }
}

test('matching all recorded criteria is 100%, even with many or repeated features', async () => {
  for (const features of [['a', 'b'], Array.from({ length: 100 }, (_, i) => `feature-${i}`), ['a', 'a', 'b']]) {
    const reference = { ...base, features }
    const { results } = await recommend(reference, [{ ...reference, id: 'candidate' }])
    assert.equal(results[0].score, 100)
  }
})

test('features have a shared five-point weight and reflect partial matches', async () => {
  const { results } = await recommend(base, [
    { ...base, id: 'none', features: [] },
    { ...base, id: 'half', features: ['balcony'] },
    { ...base, id: 'full' },
  ])
  assert.deepEqual(results.map(({ propertyId, score }) => [propertyId, score]), [['full', 100], ['half', 98], ['none', 95]])
})

test('different operations, currencies, unavailable and private properties are excluded', async () => {
  const { results, reads } = await recommend(base, [
    { ...base, id: 'rental', operation: 'RENTAL' },
    { ...base, id: 'anticretic', operation: 'ANTICRETIC' },
    { ...base, id: 'bob', currency: 'BOB' },
    { ...base, id: 'closed', status: 'SOLD' },
    { ...base, id: 'private', visibility: 'ORGANIZATION' },
    { ...base, id: 'valid' },
  ])
  assert.deepEqual(results.map(match => match.propertyId), ['valid'])
  for (const read of reads) {
    assert.equal(read.where.operation, 'SALE')
    assert.equal(read.where.currency, 'USD')
    assert.deepEqual(read.where.AND, [{ visibility: 'PUBLIC' }])
  }
})

test('missing reference data is omitted from the denominator and zero-bedroom studios count', async () => {
  const reference = { ...base, bedrooms: 0, areaSquareMeters: null, features: null, city: '', region: null, price: 0 }
  const { results } = await recommend(reference, [{ ...reference, id: 'studio' }, { ...reference, id: 'large', bedrooms: 3 }])
  assert.deepEqual(results.map(match => match.score), [100, 75])
  assert.doesNotMatch(results[0].matchReason, /ciudad|región|Precio|Área/)
})

test('object features count only enabled entries and normalize to 0–100', async () => {
  const reference = { ...base, features: { pool: true, elevator: 'true', garden: false } }
  const { results } = await recommend(reference, [
    { ...base, id: 'partial', features: { pool: true, elevator: false } },
    { ...base, id: 'different', type: 'LAND', price: 1, city: 'Otra', region: 'Otra', bedrooms: 8, areaSquareMeters: 1000, features: {} },
  ])
  assert.deepEqual(results.map(match => match.score), [98, 0])
})

test('final read excludes candidates whose operation changed after ranking', async () => {
  const { results } = await recommend(base, [{ ...base, id: 'changed' }], 6, records => { records[0].operation = 'RENTAL' })
  assert.deepEqual(results, [])
})

test('inaccessible reference returns null without reading candidates', async () => {
  const { results, reads } = await recommend(null, [])
  assert.equal(results, null)
  assert.deepEqual(reads, [])
})
