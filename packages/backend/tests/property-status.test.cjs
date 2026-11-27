const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

function load(file, imports = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const mod = { exports: {} }
  new Function('require', 'module', 'exports', source)(id => {
    if (!(id in imports)) throw new Error('Unexpected import: ' + id)
    return imports[id]
  }, mod, mod.exports)
  return mod.exports
}
class ApiError extends Error {
  constructor(statusCode, code, message = code) { super(message); Object.assign(this, { statusCode, code }) }
}
const Errors = { FORBIDDEN: new ApiError(403, 'FORBIDDEN'), UNAUTHORIZED: new ApiError(401, 'UNAUTHORIZED') }
const types = load('../../shared/src/types/index.ts')
const statuses = load('../../shared/src/propertyStatus.ts', { './types': types })
const statusFilter = load('../src/utils/propertyStatusFilter.ts', { '@shared/propertyStatus': statuses, './errors': { ApiError } })
const permissions = load('../src/lib/permissions.ts', { '@shared/types': types, '@/utils/errors': { Errors } })
const matches = (record, where) => Object.entries(where).every(([key, value]) =>
  key === 'OR' ? value.some(part => matches(record, part)) : key === 'AND' ? value.every(part => matches(record, part))
    : value && typeof value === 'object' ? Object.entries(value).every(([operator, operand]) => {
      if (operator === 'not') return record[key] !== operand
      if (operator === 'gte') return record[key] >= operand
      if (operator === 'lte') return record[key] <= operand
      if (operator === 'in') return operand.includes(record[key])
      throw new Error('Unsupported filter: ' + operator)
    }) : record[key] === value)
const owner = { id: 'owner', role: types.UserRole.ADVISOR, organizationId: 'office-a' }
const member = { id: 'member', role: types.UserRole.ADVISOR, organizationId: 'office-a' }
const director = { id: 'director', role: types.UserRole.ADVISOR, organizationId: 'office-a', permissions: [types.Permission.ORG_ADMIN] }
const property = { id: 'home', title: 'Casa', advisorId: owner.id, organizationId: owner.organizationId, visibility: 'ORGANIZATION', operation: 'RENTAL', status: 'AVAILABLE' }
const statusCodes = Object.values(types.PropertyStatus)
const json = (body, options = {}) => ({ status: options.status ?? 200, body, headers: options.headers })

function serviceSetup(record = { ...property }) {
  const writes = []
  const tx = { property: {
    findUnique: async () => record,
    update: async ({ data }) => { writes.push(data); Object.assign(record, data); return { id: record.id, status: record.status } },
  } }
  const { propertyService } = load('../src/services/property.service.ts', {
    '@/utils/propertyLocation': {}, '@/utils/propertyView': {}, '@/utils/slug': {},
    '@/lib/transactions': { serializable: work => work(tx) }, '@/lib/permissions': permissions,
    '@/utils/errors': { ApiError }, '@/lib/prisma': {}, '@shared/propertyStatus': statuses,
    '@/utils/propertyStatusFilter': statusFilter,
    '@prisma/client': { Prisma: {} },
  })
  return { propertyService, record, writes }
}

test('four user-facing states cover existing sale and rental records without changing their data', () => {
  assert.deepEqual(statuses.PROPERTY_STATUS_OPTIONS.map(option => option.label), ['Disponible', 'En pausa', 'Reservada', 'Cerrada'])
  assert.equal(statuses.getPropertyStatusLabel('RENT'), 'Cerrada')
  assert.equal(statuses.getPropertyStatusLabel('SOLD'), 'Cerrada')
  assert.match(statuses.getPropertyStatusDescription('AVAILABLE', 'ORGANIZATION'), /solo a tu organización/)
  assert.match(statuses.getPropertyStatusDescription('AVAILABLE', 'PUBLIC'), /todos los asesores/)
})

test('only available properties are accessible to ordinary viewers, including members of the publishing office', () => {
  for (const status of statusCodes) {
    for (const visibility of ['PUBLIC', 'ORGANIZATION']) {
      const record = { ...property, status, visibility }
      assert.equal(matches(record, permissions.visiblePropertyWhere(member)), status === 'AVAILABLE')
      const outsider = { ...member, organizationId: 'office-b' }
      assert.equal(matches(record, permissions.visiblePropertyWhere(outsider)), status === 'AVAILABLE' && visibility === 'PUBLIC')
      assert.equal(matches(record, permissions.visiblePropertyWhere(owner)), true)
      assert.equal(matches(record, permissions.visiblePropertyWhere(director)), true)
    }
  }
})

test('changing state or reopening a property preserves its publication audience and all other data', async () => {
  for (const visibility of ['PUBLIC', 'ORGANIZATION']) {
    const { propertyService, record, writes } = serviceSetup({ ...property, visibility })
    const original = { ...record }
    for (const status of ['ARCHIVED', 'UNDER_OFFER', 'SOLD', 'AVAILABLE']) {
      await propertyService.updatePropertyStatus('home', status, owner)
      assert.deepEqual({ ...record, status: original.status }, original)
    }
    assert.equal(record.status, 'AVAILABLE')
    assert.equal(writes.length, 4)
  }
})

test('closed sales, rentals and anticretics retain the appropriate code for existing reports', async () => {
  for (const operation of ['SALE', 'RENTAL', 'ANTICRETIC']) {
    const { propertyService, record } = serviceSetup({ ...property, operation })
    await propertyService.updatePropertyStatus('home', 'SOLD', owner)
    assert.equal(record.status, operation === 'SALE' ? 'SOLD' : 'RENT')
    assert.equal(statuses.getPropertyStatusLabel(record.status), 'Cerrada')
  }
})

test('another agent, a buyer and a foreign director cannot change state; the managing director can', async () => {
  for (const actor of [member, { ...owner, role: types.UserRole.BUYER }, { ...director, organizationId: 'office-b' }]) {
    const { propertyService, writes } = serviceSetup()
    await assert.rejects(propertyService.updatePropertyStatus('home', 'ARCHIVED', actor), { statusCode: 403 })
    assert.equal(writes.length, 0)
  }
  const { propertyService, record } = serviceSetup()
  await propertyService.updatePropertyStatus('home', 'UNDER_OFFER', director)
  assert.equal(record.status, 'UNDER_OFFER')
})

test('state endpoint rejects anonymous requests, missing and malformed states before writing', async () => {
  let actor = null
  const setup = serviceSetup()
  const route = load('../src/app/api/properties/[id]/status/route.ts', {
    'next/server': { NextResponse: { json } }, '@/utils/errors': { ApiError }, '@shared/propertyStatus': statuses,
    '@/services/property.service': setup,
    '@/middleware/auth': { requireUser: async () => { if (!actor) throw Errors.UNAUTHORIZED; return actor } },
    '@/lib/auth-route': { errorResponse: error => json({ success: false }, { status: error.statusCode ?? 500 }) },
  })
  const context = { params: Promise.resolve({ id: 'home' }) }
  const request = body => ({ json: async () => body })
  assert.equal((await route.PUT(request({ status: 'AVAILABLE' }), context)).status, 401)
  actor = owner
  for (const body of [null, {}, { status: null }, { status: 'INVALID' }, { status: ['AVAILABLE'] }]) {
    assert.equal((await route.PUT(request(body), context)).status, 400)
  }
  assert.equal(setup.writes.length, 0)
  const result = await route.PUT(request({ status: 'ARCHIVED', visibility: 'PUBLIC' }), context)
  assert.equal(result.status, 200)
  assert.equal(result.headers['Cache-Control'], 'private, no-store')
  assert.equal(setup.record.visibility, 'ORGANIZATION')
  assert.equal(setup.record.status, 'ARCHIVED')
})

test('direct links to paused, reserved and closed properties return 404 to other agents', async () => {
  let actor = member, record = property
  const route = load('../src/app/api/properties/[id]/route.ts', {
    'next/server': { NextResponse: { json } }, '@/utils/errors': { ApiError, Errors },
    '@/utils/propertyLocation': { publicPropertyLocation: value => value },
    '@/utils/propertyView': { propertyDiscoveryView: value => value }, '@/lib/permissions': permissions,
    '@/services/property.service': { propertyService: { getProperty: async () => ({ ...record, advisor: {} }) } },
    '@/middleware/auth': { verifyAuth: async () => ({ user: actor }), sendError: error => json({}, { status: error.statusCode }) },
    '@/utils/validators': {}, '@/utils/whatsappContact': { whatsappPhoneFor: () => null },
  })
  const context = { params: Promise.resolve({ id: 'home' }) }
  for (const status of statusCodes) {
    record = { ...property, status }
    actor = member
    assert.equal((await route.GET({}, context)).status, status === 'AVAILABLE' ? 200 : 404)
    actor = owner
    assert.equal((await route.GET({}, context)).status, 200)
  }
})

test('lists, search, map and favorites stop offering unavailable properties, even to their owner', async () => {
  const records = statusCodes.map(status => ({ ...property, id: status, status, latitude: -17.39, longitude: -66.15 }))
  const db = { property: {
    findMany: async ({ where }) => records.filter(record => matches(record, where)),
    count: async ({ where }) => records.filter(record => matches(record, where)).length,
  }, favorite: {
    findMany: async ({ where }) => records.filter(record => matches(record, where.property)).map(property => ({ property })),
    count: async ({ where }) => records.filter(record => matches(record, where.property)).length,
  } }
  const imports = {
    '@/lib/prisma': { prisma: db }, '@/lib/permissions': permissions, '@/lib/transactions': {},
    '@/utils/propertyLocation': { publicPropertyLocation: value => value }, '@/utils/propertyView': {},
    '@/utils/slug': {}, '@/utils/errors': { ApiError }, '@shared/propertyStatus': statuses, '@prisma/client': { Prisma: {} },
    '@/utils/propertyStatusFilter': statusFilter,
  }
  const { propertyService } = load('../src/services/property.service.ts', imports)
  for (const result of [
    await propertyService.listProperties({ viewer: owner }),
    await propertyService.searchProperties({ viewer: owner }),
    await propertyService.searchProperties({ viewer: owner, mapView: true }),
  ]) {
    assert.deepEqual(result.properties.map(record => record.id), ['AVAILABLE'])
    if ('total' in result) assert.equal(result.total, 1)
  }
  const { favoritesService } = load('../src/services/favorites.service.ts', imports)
  const result = await favoritesService.listFavorites(owner)
  assert.deepEqual(result.favorites.map(favorite => favorite.property.id), ['AVAILABLE'])
  assert.equal(result.total, 1)
})

test('office property lists expose inactive properties only for management and keep totals consistent', async () => {
  const records = statusCodes.map(status => ({ ...property, id: status, status }))
  const { organizationService } = load('../src/services/organization.service.ts', {
    '@/lib/prisma': { prisma: { property: {
      findMany: async ({ where }) => records.filter(record => matches(record, where)),
      count: async ({ where }) => records.filter(record => matches(record, where)).length,
    } } },
    '@/lib/permissions': permissions, '@/lib/transactions': {}, '@/utils/errors': {},
    '@/utils/propertyLocation': { publicPropertyLocation: value => value },
    '@shared/validation/auth': {}, './seats.service': {},
  })
  for (const [actor, expected] of [[member, 1], [owner, statusCodes.length], [director, statusCodes.length]]) {
    const result = await organizationService.getOrganizationProperties('office-a', actor)
    assert.equal(result.properties.length, expected)
    assert.equal(result.pagination.total, expected)
  }
})

function filteredReadSetup() {
  const records = statusCodes.flatMap(status => Array.from({ length: 15 }, (_, index) => ({ ...property, id: `${status}-${index}`, status })))
  records.push({ ...property, id: 'foreign-agent', advisorId: 'other', status: 'SOLD' })
  const db = { property: {
    count: async ({ where }) => records.filter(record => matches(record, where)).length,
    findMany: async ({ where, skip = 0, take = records.length }) => records.filter(record => matches(record, where)).slice(skip, skip + take),
    groupBy: async ({ where }) => statusCodes.map(status => ({ status, _count: { _all: records.filter(record => matches(record, where) && record.status === status).length } })),
  }, advisor: { findFirst: async ({ where }) => ({ id: where.id }) } }
  const imports = {
    '@/lib/prisma': { prisma: db }, '@/lib/permissions': permissions, '@/lib/transactions': {},
    '@/utils/propertyLocation': {}, '@/utils/propertyView': {}, '@/utils/slug': {},
    '@/utils/errors': { ApiError, Errors }, '@shared/propertyStatus': statuses, '@prisma/client': { Prisma: {} },
    '@/utils/whatsappContact': { whatsappPhoneFor: () => null }, '@/utils/propertyStatusFilter': statusFilter,
  }
  return {
    records,
    ...load('../src/services/property.service.ts', imports),
    ...load('../src/services/organizationAdvisor.service.ts', imports),
  }
}

test('personal filters select the whole portfolio before pagination and count closed sales and rentals together', async () => {
  const { propertyService } = filteredReadSetup()
  for (const [status, expectedStatuses, total] of [
    ['AVAILABLE', ['AVAILABLE'], 15], ['ARCHIVED', ['ARCHIVED'], 15],
    ['UNDER_OFFER', ['UNDER_OFFER'], 15], ['SOLD', ['SOLD', 'RENT'], 30],
  ]) {
    const result = await propertyService.getAdvisorProperties(owner.id, 2, 12, status)
    assert.equal(result.total, total)
    assert.equal(result.page, 2)
    assert.equal(result.properties.length, total === 15 ? 3 : 12)
    assert.ok(result.properties.every(record => record.advisorId === owner.id && expectedStatuses.includes(record.status)))
  }
  const all = await propertyService.getAdvisorProperties(owner.id, 1, 100, '')
  assert.equal(all.total, 75)
  assert.equal(all.properties.length, 75)
})

test('director filters preserve global counters, restrict office and advisor, and paginate the selected state', async () => {
  const { getOrganizationAdvisorDetail, records } = filteredReadSetup()
  records.push({ ...property, id: 'foreign-office', organizationId: 'office-b', status: 'SOLD' })
  for (const [status, total, states] of [['ARCHIVED', 15, ['ARCHIVED']], ['UNDER_OFFER', 15, ['UNDER_OFFER']], ['SOLD', 30, ['SOLD', 'RENT']]]) {
    const result = await getOrganizationAdvisorDetail(director.id, 'office-a', owner.id, 2, status)
    assert.equal(result.pagination.total, total)
    assert.equal(result.pagination.page, 2)
    assert.equal(result.pagination.pages, Math.ceil(total / 12))
    assert.equal(result.properties.length, total === 15 ? 3 : 12)
    assert.ok(result.properties.every(record => record.organizationId === 'office-a' && record.advisorId === owner.id && states.includes(record.status)))
    assert.deepEqual(result.summary, { total: 75, available: 15, paused: 15, reserved: 15, closed: 30 })
  }
})

test('empty filtered pages and a portfolio that shrank while changing state keep pagination in range', async () => {
  const { propertyService, getOrganizationAdvisorDetail, records } = filteredReadSetup()
  const last = await propertyService.getAdvisorProperties(owner.id, 999, 12, 'AVAILABLE')
  assert.equal(last.page, 2)
  assert.equal(last.properties.length, 3)
  for (const record of records) if (record.status === 'AVAILABLE') record.status = 'ARCHIVED'
  const empty = await propertyService.getAdvisorProperties(owner.id, 2, 12, 'AVAILABLE')
  assert.equal(empty.total, 0)
  assert.equal(empty.page, 1)
  assert.deepEqual(empty.properties, [])
  const detail = await getOrganizationAdvisorDetail(director.id, 'office-a', owner.id, 999, 'AVAILABLE')
  assert.deepEqual(detail.pagination, { page: 1, pageSize: 12, total: 0, pages: 0 })
  assert.deepEqual(detail.properties, [])
})

test('invalid filters are rejected instead of silently returning the complete portfolio', async () => {
  const { propertyService, getOrganizationAdvisorDetail } = filteredReadSetup()
  assert.throws(() => statusFilter.readPropertyStatusFilter('INVALID'), { statusCode: 400 })
  await assert.rejects(propertyService.getAdvisorProperties(owner.id, 1, 12, 'INVALID'), { statusCode: 400 })
  await assert.rejects(getOrganizationAdvisorDetail(director.id, 'office-a', owner.id, 1, 'INVALID'), { statusCode: 400 })
})
