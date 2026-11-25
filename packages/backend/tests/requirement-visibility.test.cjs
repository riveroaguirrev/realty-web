const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const path = require('node:path')
function service(db) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/services/requirement.service.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const mod = { exports: {} }
  const req = name => {
    if (name === '@/lib/prisma') return { prisma: db }
    if (name === '@/utils/authenticatedRoute') return { RouteError: class extends Error { constructor(status, message) { super(message); this.status = status } } }
    return {}
  }
  new Function('require', 'module', 'exports', source)(req, mod, mod.exports)
  return mod.exports
}
const dbFor = organizationId => ({ advisor: { findUnique: async () => ({ organizationId }) } })
test('public scope clears organization, private scope uses database membership', async () => {
  const db = dbFor('org-a'); const api = service(db)
  assert.deepEqual(await api.requirementScope(db, 'author', 'PUBLIC'), { visibility: 'PUBLIC', organizationId: null })
  assert.deepEqual(await api.requirementScope(db, 'author', 'ORGANIZATION'), { visibility: 'ORGANIZATION', organizationId: 'org-a' })
  await assert.rejects(api.requirementScope(dbFor(null), 'author', 'ORGANIZATION'), error => error.status === 400)
})
test('outsiders only see public requirements and their own; members gain their own organization only', async () => {
  const api = service({})
  assert.deepEqual(await api.requirementAccess(dbFor(null), 'a'), { OR: [{ buyerId: 'a' }, { visibility: 'PUBLIC' }] })
  assert.deepEqual(await api.requirementAccess(dbFor('org-a'), 'a'), { OR: [{ buyerId: 'a' }, { visibility: 'PUBLIC' }, { visibility: 'ORGANIZATION', organizationId: 'org-a' }] })
})
test('list and direct detail both enforce audience; owner can still see paused records', async () => {
  const calls = []
  const db = { ...dbFor('org-a'), requirement: { findMany: async args => { calls.push(args); return [] }, count: async () => 0, findFirst: async args => { calls.push(args); return null } } }
  const api = service(db)
  await api.listRequirements('a', false, 1)
  assert.equal(calls[0].where.status, 'ACTIVE')
  assert.deepEqual(calls[0].where.OR[2], { visibility: 'ORGANIZATION', organizationId: 'org-a' })
  await api.getRequirementDetail('private-id', 'a')
  assert.equal(calls[1].where.id, 'private-id')
  assert.equal(calls[1].where.AND.length, 2)
  assert.equal(calls[0].select.buyer.select.phone, undefined)
  assert.equal(calls[1].select.buyer.select.phone, true)
})
test('visibility changes reject non-owners and clear notices to outsiders when restricting', async () => {
  const deleted = []; const updated = []
  const tx = { ...dbFor('org-a'), requirement: { findFirst: async () => ({ visibility: 'PUBLIC', organizationId: null }), update: async args => updated.push(args) }, notification: { deleteMany: async args => deleted.push(args) } }
  const api = service({ $transaction: fn => fn(tx) })
  await api.updateRequirement('r', 'a', { visibility: 'ORGANIZATION' })
  assert.deepEqual(updated[0].data, { visibility: 'ORGANIZATION', organizationId: 'org-a' })
  assert.equal(deleted[0].where.relatedEntityId, 'r')
  assert.deepEqual(deleted[0].where.advisor.OR, [{ organizationId: null }, { organizationId: { not: 'org-a' } }])
  tx.requirement.findFirst = async () => null
  await assert.rejects(api.updateRequirement('r', 'outsider', { visibility: 'PUBLIC' }), error => error.status === 404)
})

test('organization tab filters in the database before pagination and rejects accounts without membership', async () => {
  let listing, counting
  const db = { ...dbFor('org-a'), requirement: { findMany: async args => { listing = args; return [] }, count: async args => { counting = args; return 0 } } }
  await service(db).listRequirements('a', false, 2, true)
  assert.equal(listing.skip, 20)
  assert.deepEqual(listing.where, counting.where)
  assert.equal(listing.where.status, 'ACTIVE')
  assert.deepEqual(listing.where.AND, [{ OR: [
    { visibility: 'PUBLIC', buyer: { organizationId: 'org-a' } },
    { visibility: 'ORGANIZATION', organizationId: 'org-a' },
  ] }])
  const outsider = dbFor(null)
  await assert.rejects(service(outsider).listRequirements('a', false, 1, true), error => error.status === 403)
})
