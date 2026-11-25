const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
class ApiError extends Error { constructor(statusCode, code, message) { super(message); Object.assign(this, { statusCode, code }) } }
const forbidden = new ApiError(403, 'FORBIDDEN', 'Forbidden')
function load(file, mocks) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', source)(name => { if (!(name in mocks)) throw new Error('Unexpected dependency: ' + name); return mocks[name] }, module, module.exports)
  return module.exports
}
function setup({ director = true, member = true } = {}) {
  const calls = { advisors: [], properties: [], groups: [] }
  const profile = { id: 'agent', firstName: 'Ana', lastName: 'Test', email: 'ana@example.com' }
  const db = {
    advisor: { findFirst: async args => { calls.advisors.push(args); return calls.advisors.length === 1 ? director ? { id: 'director' } : null : member ? profile : null } },
    property: {
      findMany: async args => { calls.properties.push(args); return [{ id: 'p1', title: 'Casa', status: 'AVAILABLE' }] },
      groupBy: async args => { calls.groups.push(args); return [{ status: 'AVAILABLE', _count: { _all: 13 } }, { status: 'SOLD', _count: { _all: 2 } }, { status: 'RENT', _count: { _all: 1 } }, { status: 'ARCHIVED', _count: { _all: 4 } }] },
    },
  }
  const service = load('../src/services/organizationAdvisor.service.ts', {
    '@/lib/prisma': { prisma: db }, '@/utils/errors': { ApiError, Errors: { FORBIDDEN: forbidden } },
    '@/utils/propertyView': { propertyCardSelect: { id: true, title: true, price: true, images: true } },
    '@/utils/whatsappContact': { whatsappPhoneFor: () => null },
  })
  return { calls, profile, service }
}
test('only a currently active director in the requested organization can read an agent profile', async () => {
  const { calls, service } = setup()
  await service.getOrganizationAdvisorDetail('director', 'org-a', 'agent')
  assert.deepEqual(calls.advisors[0].where, { id: 'director', organizationId: 'org-a', role: 'DIRECTOR', userRole: 'ADVISOR', status: 'ACTIVE' })
  assert.deepEqual(calls.advisors[1].where, { id: 'agent', organizationId: 'org-a', userRole: 'ADVISOR' })
})
test('a non-director, inactive director or director of another organization receives no agent or property data', async () => {
  const { calls, service } = setup({ director: false })
  await assert.rejects(service.getOrganizationAdvisorDetail('outsider', 'org-a', 'agent'), { statusCode: 403 })
  assert.equal(calls.advisors.length, 1)
  assert.equal(calls.properties.length, 0)
  assert.equal(calls.groups.length, 0)
})
test('agents who left the organization or unknown ids return 404 without reading properties', async () => {
  const { calls, service } = setup({ member: false })
  await assert.rejects(service.getOrganizationAdvisorDetail('director', 'org-a', 'foreign-agent'), { statusCode: 404 })
  assert.equal(calls.properties.length, 0)
})
test('profile selection excludes credentials, documents, bank details and unrelated private metadata', () => {
  const { service } = setup()
  for (const field of ['activeSessionId', 'authorizedBrowserHash', 'credentialsVersion', 'bankAccount', 'documentUrl', 'metadata', 'totalSalesCommission', 'commissionRate']) assert.equal(service.organizationAdvisorProfileSelect[field], undefined)
  assert.equal(service.organizationAdvisorProfileSelect.phone, true)
  assert.equal(service.organizationAdvisorProfileSelect.bio, true)
})
test('properties and accurate totals are restricted to both agent and organization before pagination', async () => {
  const { calls, service } = setup()
  const data = await service.getOrganizationAdvisorDetail('director', 'org-a', 'agent', 2)
  assert.deepEqual(calls.properties[0].where, { advisorId: 'agent', organizationId: 'org-a' })
  assert.deepEqual(calls.groups[0].where, calls.properties[0].where)
  assert.equal(calls.properties[0].take, 12)
  assert.equal(calls.properties[0].skip, 12)
  assert.deepEqual(data.summary, { total: 20, available: 13, closed: 3, archived: 4 })
  assert.deepEqual(data.pagination, { page: 2, pageSize: 12, total: 20, pages: 2 })
})
test('invalid page values cannot create unbounded or negative queries', async () => {
  for (const input of [0, -1, 1.5, NaN]) {
    const { calls, service } = setup()
    await service.getOrganizationAdvisorDetail('director', 'org-a', 'agent', input)
    assert.equal(calls.properties[0].skip, 0)
  }
  const { calls, service } = setup()
  await service.getOrganizationAdvisorDetail('director', 'org-a', 'agent', 100000)
  assert.equal(calls.properties[0].skip, 119988)
})
test('the detail route authenticates before querying and disables caching for contact information', async () => {
  let fail = true, reads = 0
  const route = load('../src/app/api/organizations/[id]/advisors/[advisorId]/route.ts', {
    '@/utils/errors': { ApiError, Errors: {} },
    '@/lib/auth-route': { errorResponse: error => ({ status: error.statusCode }) },
    'next/server': { NextResponse: { json: (body, options) => ({ body, ...options }) } },
    '@shared/types': {}, '@/middleware/auth': { requireUser: async () => { if (fail) throw new ApiError(401); return { id: 'director' } } },
    '@/services/advisor.service': {}, '@/lib/permissions': {},
    '@/services/organizationAdvisor.service': { getOrganizationAdvisorDetail: async (...args) => { reads++; assert.deepEqual(args, ['director', 'org-a', 'agent', 2]); return { advisor: { id: 'agent' } } } },
    '@/utils/pagination': { readPagination: () => ({ page: 2 }) },
  })
  const params = { params: Promise.resolve({ id: 'org-a', advisorId: 'agent' }) }
  assert.equal((await route.GET({}, params)).status, 401)
  assert.equal(reads, 0)
  fail = false
  const response = await route.GET({ nextUrl: { searchParams: new URLSearchParams() } }, params)
  assert.equal(response.headers['Cache-Control'], 'no-store')
  assert.equal(response.body.success, true)
})
