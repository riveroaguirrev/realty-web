const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
function load(relative) {
  const filename = path.resolve(__dirname, relative)
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', source)(require, module, module.exports)
  return module.exports
}
const { scoreRequirement } = load('../src/utils/requirementMatching.ts')
const { requirementInput } = load('../src/utils/requirementInput.ts')
const r = { title: 'Oficina en planta baja', description: '', operation: 'RENTAL', propertyType: ['OFFICE'], currency: 'BOB', priceMin: null, priceMax: 4000, cities: ['Cochabamba'], zones: ['Norte', 'Beijing'], bedroomsMin: null, bathroomsMin: null, areaMin: null, requiresGarage: false, requiresGroundFloor: true, petsRequired: false }
const p = { id: 'office', title: 'Oficina Beijing en planta baja', description: null, operation: 'RENTAL', type: 'OFFICE', currency: 'BOB', price: 3800, city: 'Cochabamba', region: 'Cochabamba', bedrooms: null, bathrooms: null, areaSquareMeters: 60, hasGarage: false, parking: null, petsAllowed: false, petPolicy: 'NOT_ALLOWED', features: null }
test('Andy: rental office, Bs 4000, any requested zone and ground floor', () => {
  const result = scoreRequirement(r, p)
  assert.equal(result.score, 100)
  assert.deepEqual(result.mismatches, [])
})
test('open budget allows commercial restaurant premises at any price', () => {
  const input = { ...r, propertyType: ['COMMERCIAL'], priceMax: null, areaMin: 50 }
  assert.equal(requirementInput.safeParse(input).success, true)
  assert.ok(scoreRequirement(input, { ...p, type: 'COMMERCIAL', price: 8500 }))
  const match = scoreRequirement(input, { ...p, type: 'COMMERCIAL', areaSquareMeters: 40 })
  assert.ok(match.mismatches.includes('Superficie: no cumple el mínimo'))
})
test('Lean: 3 bedrooms, Bs 2600 and garage; no pets required is not a restriction on listings', () => {
  const input = { ...r, propertyType: ['APARTMENT'], priceMax: 2600, bedroomsMin: 3, requiresGarage: true, requiresGroundFloor: false, zones: ['Parque ex combatientes'] }
  const property = { ...p, type: 'APARTMENT', price: 2600, bedrooms: 3, parking: 1, title: 'Departamento parque ex combatientes', petPolicy: 'ALLOWED' }
  assert.equal(scoreRequirement(input, property).score, 100)
})
test('never compare incompatible operations, types, currencies or cities', () => {
  for (const change of [{operation:'SALE'}, {operation:'ANTICRETIC'}, {type:'HOUSE'}, {currency:'USD'}, {city:'La Paz'}]) assert.equal(scoreRequirement(r, {...p, ...change}), null)
})
test('slightly out of budget is explicit, far beyond it is excluded', () => {
  assert.ok(scoreRequirement(r, {...p, price:4400}).mismatches.includes('Fuera del presupuesto'))
  assert.equal(scoreRequirement(r, {...p, price:5000}), null)
})
test('unknown zone, ground floor and area cannot be presented as confirmed matches', () => {
  const result = scoreRequirement({...r, areaMin:50}, {...p, title:'Oficina', areaSquareMeters:null})
  assert.ok(result.mismatches.includes('Zona solicitada: por confirmar'))
  assert.ok(result.mismatches.includes('Planta baja: por confirmar'))
  assert.ok(result.mismatches.includes('Superficie: no cumple el mínimo: por confirmar'))
  assert.equal(result.reasons.includes('Planta baja indicada'), false)
})
test('accents and case do not prevent city or zone matches', () => {
  assert.ok(scoreRequirement({...r, cities:['COCHABÁMBA'], zones:['BEIJING']}, p))
})
test('validation rejects inverted budgets, empty cities, invalid enums and negative surface', () => {
  for (const change of [{priceMin:5000}, {cities:[]}, {operation:'LEASE'}, {currency:'EUR'}, {propertyType:[]}, {areaMin:-1}, {bedroomsMin:2.5}, {requiresGarage:'true'}]) assert.equal(requirementInput.safeParse({...r,...change}).success, false)
  assert.equal(requirementInput.parse({...r,buyerId:'forged',status:'FULFILLED'}).buyerId, undefined)
})

function loadMocked(relative, mocks) {
  const filename = path.resolve(__dirname, relative)
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', source)(id => id in mocks ? mocks[id] : require(id), module, module.exports)
  return module.exports
}
test('publication announces to other active advisors within the same transaction', async () => {
  let transactionCount = 0
  let notificationData
  const tx = {
    requirement: { create: async args => {
      assert.equal(args.data.buyerId, 'author')
      assert.equal(args.data.status, undefined)
      return { ...args.data, id: 'new-req', buyer: { firstName: 'Andy', lastName: 'Velarde' } }
    } },
    advisor: { findMany: async args => {
      assert.deepEqual(args.where, { status: 'ACTIVE', id: { not: 'author' } })
      return [{ id: 'other' }]
    } },
    notification: { createMany: async args => { notificationData = args.data } },
  }
  const service = loadMocked('../src/services/requirement.service.ts', {
    '@/lib/prisma': { prisma: { $transaction: async fn => { transactionCount++; return fn(tx) } } },
    '@/utils/requirementInput': { requirementInput }, '@/utils/requirementMatching': { scoreRequirement },
    '@/utils/propertyLocation': { publicPropertyLocation: x => x },
  })
  await service.publishRequirement('author', { ...r, buyerId: 'forged', status: 'FULFILLED' })
  assert.equal(transactionCount, 1)
  assert.equal(notificationData[0].advisorId, 'other')
  assert.equal(notificationData[0].type, 'REQUIREMENT_CREATED')
  assert.equal(notificationData[0].actionUrl, '/requirements/new-req')
})
test('only the owning advisor can modify a requirement, including status changes', async () => {
  let filter
  const route = loadMocked('../src/app/api/requirements/[id]/route.ts', {
    'next/server': { NextResponse: { json: (body) => body } },
    '@/utils/authenticatedRoute': { authenticatedRoute: (_req, fn) => fn('author'), RouteError: class extends Error {} },
    '@/services/requirement.service': { getRequirement: async () => r },
    '@/utils/requirementInput': { requirementInput },
    '@/lib/prisma': { prisma: { requirement: { updateMany: async args => { filter = args.where; return { count: 0 } } } } },
  })
  await assert.rejects(() => route.PUT({ json: async () => ({ status: 'FULFILLED' }) }, { params: { id: 'someone-elses' } }))
  assert.deepEqual(filter, { id: 'someone-elses', buyerId: 'author' })
})
test('push delivery removes expired subscriptions and leaves successful notices out of the queue', async () => {
  const old = { VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY, VAPID_SUBJECT: process.env.VAPID_SUBJECT }
  Object.assign(process.env, { VAPID_PUBLIC_KEY:'public', VAPID_PRIVATE_KEY:'private', VAPID_SUBJECT:'mailto:a@example.com' })
  let removed, update
  try {
    const service = loadMocked('../src/services/push.service.ts', {
      'web-push': { setVapidDetails: () => {}, sendNotification: async () => { throw { statusCode:410 } } },
      '@/lib/prisma': { prisma: {
        notification: { findMany: async () => [{id:'n1',advisorId:'other',sendAttempts:0}], updateMany: async () => ({count:1}), update: async args => { update = args.data } },
        pushSubscription: { findMany: async () => [{ id:'s1',endpoint:'https://fcm.googleapis.com/a',p256dh:'key',auth:'auth' }], deleteMany: async args => { removed = args.where } },
      } },
    })
    await service.deliverPendingPush()
    assert.deepEqual(removed, {id:'s1'})
    assert.equal(update.scheduledFor, null)
  } finally { for (const [key,value] of Object.entries(old)) { if (value == null) delete process.env[key]; else process.env[key] = value } }
})
