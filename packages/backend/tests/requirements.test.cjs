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
const { scoreRequirement, REQUIREMENT_MATCH_WEIGHTS } = load('../src/utils/requirementMatching.ts')
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
test('budget is weighted, so out-of-budget alternatives remain explicit rather than silently excluded', () => {
  assert.ok(scoreRequirement(r, {...p, price:4400}).mismatches.includes('Fuera del presupuesto'))
  const far = scoreRequirement(r, {...p, price:5000})
  assert.ok(far.mismatches.includes('Fuera del presupuesto'))
  assert.equal(far.breakdown.find(c => c.key === 'budget').earnedWeight, 0)
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
test('requested priorities sum to 100 and each criterion affects the score by its approved weight', () => {
  assert.deepEqual(REQUIREMENT_MATCH_WEIGHTS, { bedrooms:25, zone:20, budget:18, parking:12, pets:10, area:8, preferences:7 })
  const criteria = { ...r, bedroomsMin:3, bathroomsMin:2, areaMin:50, requiresGarage:true, petsRequired:true }
  const complete = { ...p, bedrooms:3, bathrooms:2, hasGarage:true, parking:1, petsAllowed:true, petPolicy:'ALLOWED', features:{ floor:0 } }
  const matched = scoreRequirement(criteria, complete)
  assert.equal(matched.score, 100)
  assert.equal(matched.totalWeight, 100)
  assert.deepEqual(matched.breakdown.map(c => c.key), Object.keys(REQUIREMENT_MATCH_WEIGHTS))
  for (const [change, expected] of [
    [{bedrooms:2},75], [{title:'Oficina',description:null},80], [{price:5000},82],
    [{hasGarage:false,parking:0},88], [{petsAllowed:false,petPolicy:'NOT_ALLOWED'},90],
    [{areaSquareMeters:40},92], [{bathrooms:1,features:{floor:1}},93],
  ]) assert.equal(scoreRequirement(criteria, {...complete,...change}).score, expected)
})
test('unspecified criteria redistribute weights; missing property data earns nothing', () => {
  const criteria = { ...r, zones:[], priceMax:null, requiresGroundFloor:false, bedroomsMin:3, requiresGarage:true }
  const result = scoreRequirement(criteria, {...p,bedrooms:3})
  assert.equal(result.totalWeight, 37)
  assert.equal(result.score, 68)
  assert.deepEqual(result.breakdown.map(c => c.key), ['bedrooms','parking'])
  assert.equal(result.breakdown[1].status, 'UNKNOWN')
  assert.ok(result.mismatches.includes('Parqueo no indicado: por confirmar'))
  assert.equal(scoreRequirement(criteria, {...p,bedrooms:null}).score, 0)
})
test('matching rooms matters more than matching only the budget', () => {
  const criteria = { ...r, zones:[], requiresGroundFloor:false, bedroomsMin:3 }
  const roomsMatch = scoreRequirement(criteria, {...p, bedrooms:3,price:6000})
  const budgetMatch = scoreRequirement(criteria, {...p, bedrooms:2,price:3800})
  assert.ok(roomsMatch.score > budgetMatch.score)
})
test('additional preferences share seven points instead of adding seven points each', () => {
  const criteria = { ...r, zones:[],priceMax:null,bathroomsMin:2 }
  const result = scoreRequirement(criteria, {...p,bathrooms:2,title:'Oficina',features:{floor:1}})
  assert.equal(result.totalWeight, 7)
  assert.equal(result.breakdown[0].earnedWeight, 3.5)
  assert.equal(result.score, 50)
})
test('general eligibility alone is not presented as 100 percent compatibility', () => {
  const result = scoreRequirement({...r,zones:[],priceMax:null,requiresGroundFloor:false}, p)
  assert.equal(result.score, null)
  assert.equal(result.totalWeight, 0)
  assert.deepEqual(result.breakdown, [])
})
test('zone matching uses word boundaries, rather than confusing Norte with a longer word', () => {
  const result = scoreRequirement({...r,zones:['Norte']}, {...p,title:'Oficina Nortenia',description:null})
  assert.equal(result.breakdown.find(c => c.key === 'zone').status, 'UNKNOWN')
})
test('validation rejects inverted budgets, empty cities, invalid enums and negative surface', () => {
  for (const change of [{priceMin:5000}, {cities:[]}, {operation:'LEASE'}, {currency:'EUR'}, {propertyType:[]}, {areaMin:-1}, {bedroomsMin:2.5}, {requiresGarage:'true'}]) assert.equal(requirementInput.safeParse({...r,...change}).success, false)
  assert.equal(requirementInput.parse({...r,buyerId:'forged',status:'FULFILLED'}).buyerId, undefined)
})

function loadMocked(relative, mocks) {
  if (!mocks['@/utils/authenticatedRoute']) mocks['@/utils/authenticatedRoute'] = { RouteError: class extends Error {} }
  const filename = path.resolve(__dirname, relative)
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', source)(id => id in mocks ? mocks[id] : require(id), module, module.exports)
  return module.exports
}
test('suggestions evaluate older candidates and rank by compatibility, not publication recency', async () => {
  const criteria = { ...r,status:'ACTIVE',rejectedProperties:[],zones:[],requiresGroundFloor:false,bedroomsMin:3 }
  const candidates = Array.from({length:501}, (_,i) => ({...p,id:String(i).padStart(4,'0'),bedrooms:i===500?3:2,images:[]}))
  let batches = 0
  const service = loadMocked('../src/services/requirement.service.ts', {
    '@/lib/prisma': { prisma: {
      requirement: {findUnique:async()=>criteria},
      property: {findMany:async query=>{
        batches++
        assert.equal(query.where.status,'AVAILABLE')
        assert.equal(query.where.operation,'RENTAL')
        assert.equal(query.where.currency,'BOB')
        assert.equal(query.where.price,undefined)
        return candidates.filter(c=>!query.where.id.gt||c.id>query.where.id.gt).slice(0,query.take)
      }},
    }},
    '@/utils/requirementInput':{requirementInput}, '@/utils/requirementMatching':{scoreRequirement}, '@/utils/propertyView':{propertyCardSelect:{}},
  })
  const result = await service.requirementSuggestions('q')
  assert.equal(batches,2)
  assert.equal(result.length,12)
  assert.equal(result[0].propertyId,'0500')
  assert.equal(result[0].score,100)
  assert.equal(result[1].score,42)
})
test('budget and minimum-score filters are applied before taking the best twelve results', async () => {
  const criteria = {...r,status:'ACTIVE',rejectedProperties:[],zones:[],requiresGroundFloor:false,bedroomsMin:3}
  let priceFilter
  const service = loadMocked('../src/services/requirement.service.ts', {
    '@/lib/prisma':{prisma:{requirement:{findUnique:async()=>criteria},property:{findMany:async query=>{
      priceFilter=query.where.price
      return [{...p,id:'yes',bedrooms:3,images:[]},{...p,id:'no',bedrooms:2,images:[]}]
    }}}},
    '@/utils/requirementInput':{requirementInput}, '@/utils/requirementMatching':{scoreRequirement}, '@/utils/propertyView':{propertyCardSelect:{}},
  })
  const matches=await service.requirementSuggestions('q',{minScore:80,withinBudget:true})
  assert.deepEqual(priceFilter,{gte:undefined,lte:4000})
  assert.deepEqual(matches.map(m=>m.propertyId),['yes'])
})
test('requirement detail validates score filters and forwards them to suggestion ranking', async () => {
  const calls=[]
  const route=loadMocked('../src/app/api/requirements/[id]/route.ts', {
    'next/server':{NextResponse:{json:body=>body}},
    '@/utils/authenticatedRoute':{authenticatedRoute:(_request,handler)=>handler('viewer'),RouteError:class extends Error{}},
    '@/services/requirement.service':{getRequirement:async()=>r,requirementSuggestions:async(...args)=>{calls.push(args);return[]}},
    '@/utils/requirementInput':{requirementInput},'@/lib/prisma':{prisma:{}},
  })
  const request=search=>({nextUrl:new URL('https://realty.test/api/requirements/q'+search)})
  await route.GET(request('?minScore=80&withinBudget=true'),{params:Promise.resolve({id:'q'})})
  assert.deepEqual(calls,[['q',{minScore:80,withinBudget:true}]])
  for(const search of ['?minScore=101','?minScore=NaN','?withinBudget=anything']) {
    await assert.rejects(()=>route.GET(request(search),{params:Promise.resolve({id:'q'})}))
  }
  assert.equal(calls.length,1)
})
test('publication announces to other active advisors within the same transaction', async () => {
  let transactionCount = 0
  let notificationData
  const tx = {
    requirement: { create: async args => {
      assert.equal(args.data.buyerId, 'author')
      assert.equal(args.data.status, undefined)
      return { ...args.data, id: 'new-req', buyer: { firstName: 'Andy', lastName: 'Velarde' } }
    } },
    $executeRaw: async (sql, ...values) => {
      const statement = sql.join('?')
      assert.match(statement, /INSERT INTO "Notification"/)
      assert.match(statement, /"status" = 'ACTIVE' AND "userRole" = 'ADVISOR' AND "id" <> \?/)
      notificationData = values
    },
  }
  const service = loadMocked('../src/services/requirement.service.ts', {
    '@/lib/prisma': { prisma: { $transaction: async fn => { transactionCount++; return fn(tx) } } },
    '@/utils/requirementInput': { requirementInput }, '@/utils/requirementMatching': { scoreRequirement },
    '@/utils/propertyView': { propertyCardSelect: {} },
  })
  await service.publishRequirement('author', { ...r, buyerId: 'forged', status: 'FULFILLED' })
  assert.equal(transactionCount, 1)
  assert.deepEqual(notificationData, ['Andy Velarde: ' + r.title, 'new-req', '/requirements/new-req', 'author', 'PUBLIC', null])
})
test('only the owning advisor can modify a requirement, including status changes', async () => {
  let filter
  const route = loadMocked('../src/app/api/requirements/[id]/route.ts', {
    'next/server': { NextResponse: { json: (body) => body } },
    '@/utils/authenticatedRoute': { authenticatedRoute: (_req, fn) => fn('author'), RouteError: class extends Error {} },
    '@/services/requirement.service': { getRequirement: async () => r, updateRequirement: async (id, buyerId) => { filter = { id, buyerId }; throw new Error('Not owner') } },
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
      './requirement.service': { getRequirement: async () => ({ id: 'r1' }) },
      'web-push': { setVapidDetails: () => {}, sendNotification: async () => { throw { statusCode:410 } } },
      '@/lib/prisma': { prisma: {
        notification: { findMany: async () => [{id:'n1',advisorId:'other',relatedEntityId:'r1',sendAttempts:0}], updateMany: async () => ({count:1}), update: async args => { update = args.data } },
        pushSubscription: { findMany: async () => [{ id:'s1',endpoint:'https://fcm.googleapis.com/a',p256dh:'key',auth:'auth' }], deleteMany: async args => { removed = args.where } },
      } },
    })
    await service.deliverPendingPush()
    assert.deepEqual(removed, {id:'s1'})
    assert.equal(update.scheduledFor, null)
  } finally { for (const [key,value] of Object.entries(old)) { if (value == null) delete process.env[key]; else process.env[key] = value } }
})

test('requirements reject buyers and revoked sessions before accessing data', async () => {
  let databaseReads = 0
  let user = { id: 'advisor', role: 'BUYER' }
  const SessionError = class extends Error { constructor() { super('Sesión reemplazada'); this.code = 'SESSION_REPLACED'; this.statusCode = 401 } }
  const { authenticatedRoute } = loadMocked('../src/utils/authenticatedRoute.ts', {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
    zod: { ZodError: class extends Error {} },
    '@/middleware/auth': { requireUser: async () => { if (!user) throw new SessionError(); return user } },
    '@/lib/prisma': { prisma: { advisor: { findUnique: async () => { databaseReads++; return { status: 'ACTIVE' } } } } },
    '@/utils/errors': { ApiError: SessionError },
  })
  let called = false
  const handler = async () => { called = true; return { status: 200 } }
  const buyer = await authenticatedRoute({}, handler)
  assert.equal(buyer.status, 403)
  assert.equal(databaseReads, 0)
  assert.equal(called, false)
  user = null
  const revoked = await authenticatedRoute({}, handler)
  assert.equal(revoked.status, 401)
  assert.equal(revoked.body.error.code, 'SESSION_REPLACED')
  assert.equal(databaseReads, 0)
  user = { id: 'advisor', role: 'ADVISOR' }
  const advisor = await authenticatedRoute({}, handler)
  assert.equal(advisor.status, 200)
  assert.equal(databaseReads, 1)
})

test('push subscriptions can be refreshed by the owner and another account cannot reassign them', async () => {
  let writes = 0
  let advisorId = 'owner'
  const subscription = { id: 'subscription', advisorId: 'owner' }
  const { ApiError } = loadMocked('../src/utils/errors.ts', {})
  const route = loadMocked('../src/app/api/notifications/subscriptions/route.ts', {
    'next/server': { NextResponse: { json: body => body } },
    '@/lib/transactions': { serializable: async fn => fn({ pushSubscription: {
      findUnique: async () => subscription,
      update: async () => { writes++ },
    } }) },
    '@/lib/prisma': { prisma: {} },
    '@/utils/authenticatedRoute': { authenticatedRoute: (_request, handler) => handler(advisorId) },
    '@/utils/errors': { ApiError },
    '@/services/push.service': {},
  })
  const request = { json: async () => ({
    endpoint: 'https://fcm.googleapis.com/test-subscription',
    keys: { p256dh: 'a'.repeat(87), auth: 'b'.repeat(22) },
  }) }
  assert.equal((await route.POST(request)).data.subscribed, true)
  assert.equal(writes, 1)
  advisorId = 'other'
  await assert.rejects(route.POST(request), { statusCode: 409, code: 'PUSH_SUBSCRIPTION_CONFLICT' })
  assert.equal(writes, 1)
  assert.equal(subscription.advisorId, 'owner')
})

test('the requirement detail uses the same publication visibility for any advisor except its owner', async () => {
  let query
  const service = loadMocked('../src/services/requirement.service.ts', {
    '@/lib/prisma': { prisma: { advisor: { findUnique: async () => ({ organizationId: null }) }, requirement: { findFirst: async args => { query = args } } } },
    '@/utils/requirementInput': { requirementInput },
    '@/utils/requirementMatching': { scoreRequirement },
    '@/utils/propertyView': { propertyCardSelect: {} },
  })
  await service.getRequirement('record', 'viewer')
  assert.deepEqual(query.where, { id: 'record', AND: [{ OR: [{ buyerId: 'viewer' }, { visibility: 'PUBLIC' }] }, { OR: [{ status: 'ACTIVE' }, { buyerId: 'viewer' }] }] })
  assert.equal(query.select.rejectedProperties, undefined)
})

test('photo cleanup preserves referenced files and retains rows that need a retry', async () => {
  const removedAt = new Date()
  const queued = [
    { id: 'linked', url: 'still-linked', path: 'linked.jpg', removedAt },
    { id: 'gone', url: 'no-reference', path: 'gone.jpg', removedAt },
    { id: 'retry', url: 'storage-error', path: 'retry.jpg', removedAt },
  ]
  const storageCalls = []
  const cleared = []
  const deferred = []
  const { propertyImageService } = loadMocked('../src/services/propertyImage.service.ts', {
    '@/utils/validatePropertyImage': { MAX_IMAGE_BYTES: 4 * 1024 * 1024 },
    '@/utils/errors': {},
    '@/lib/prisma': { prisma: {
      propertyImage: {
        findMany: async () => queued,
        updateMany: async ({ where }) => { deferred.push(where.id); return { count: 1 } },
        deleteMany: async ({ where }) => { cleared.push(where.id); return { count: 1 } },
      },
      property: { findFirst: async ({ where }) => where.images.has === 'still-linked' ? { id: 'existing' } : null },
    } },
    '@/lib/supabase': { supabase: { storage: { from: () => ({
      remove: async ([path]) => {
        storageCalls.push(path)
        return { error: path === 'retry.jpg' ? { statusCode: '503' } : null }
      },
    }) } } },
  })
  assert.equal(await propertyImageService.cleanupRemovedImages(), 1)
  assert.deepEqual(storageCalls, ['gone.jpg', 'retry.jpg'])
  assert.deepEqual(cleared, ['gone'])
  assert.deepEqual(deferred, ['linked', 'retry'])
})

test('organization publication derives the audience from membership and restricts notification recipients', async () => {
  let notificationValues
  const tx = {
    advisor: { findUnique: async () => ({ organizationId: 'org-a' }) },
    requirement: { create: async ({ data }) => {
      assert.equal(data.organizationId, 'org-a')
      return { ...data, id: 'private', buyer: { firstName: 'Ana', lastName: 'Pérez' } }
    } },
    $executeRaw: async (sql, ...values) => { assert.match(sql.join('?'), /"organizationId" = \?/); notificationValues = values },
  }
  const api = loadMocked('../src/services/requirement.service.ts', {
    '@/lib/prisma': { prisma: { $transaction: fn => fn(tx) } },
    '@/utils/requirementInput': { requirementInput }, '@/utils/requirementMatching': {}, '@/utils/propertyView': {},
  })
  await api.publishRequirement('author', { ...r, visibility: 'ORGANIZATION', organizationId: 'forged-org' })
  assert.deepEqual(notificationValues.slice(-2), ['ORGANIZATION', 'org-a'])
  assert.equal(requirementInput.safeParse({ ...r, visibility: 'INVALID' }).success, false)
})

test('push delivery discards queued notices after recipient loses access', async () => {
  const old = { VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY, VAPID_SUBJECT: process.env.VAPID_SUBJECT }
  Object.assign(process.env, { VAPID_PUBLIC_KEY: 'public', VAPID_PRIVATE_KEY: 'private', VAPID_SUBJECT: 'mailto:a@example.com' })
  let subscriptions = 0, stopped = false
  try {
    const api = loadMocked('../src/services/push.service.ts', {
      './requirement.service': { getRequirement: async () => null },
      'web-push': { setVapidDetails: () => {}, sendNotification: async () => assert.fail('Private notice must not be sent') },
      '@/lib/prisma': { prisma: {
        notification: { findMany: async () => [{ id: 'n', advisorId: 'outsider', relatedEntityId: 'private', sendAttempts: 0 }], updateMany: async args => { if (args.data.scheduledFor === null) stopped = true; return { count: 1 } } },
        pushSubscription: { findMany: async () => { subscriptions++; return [] } },
      } },
    })
    await api.deliverPendingPush()
    assert.equal(subscriptions, 0)
    assert.equal(stopped, true)
  } finally { for (const [key, value] of Object.entries(old)) { if (value == null) delete process.env[key]; else process.env[key] = value } }
})
