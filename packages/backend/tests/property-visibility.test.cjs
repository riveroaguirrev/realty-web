const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
function load(file, imports = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const mod = { exports: {} }
  new Function('require', 'module', 'exports', source)(id => imports[id] || {}, mod, mod.exports)
  return mod.exports
}
const permissions = load('lib/permissions.ts', { '@shared/types': { UserRole: { BUYER: 'BUYER' }, Permission: { ORG_ADMIN: 'ORG_ADMIN' } } })
const matches = (record, where) => Object.entries(where).every(([key, value]) => key === 'OR' ? value.some(part => matches(record, part)) : key === 'AND' ? value.every(part => matches(record, part)) : value && typeof value === 'object' && 'not' in value ? record[key] !== value.not : record[key] === value)
const internal = { advisorId: 'owner', organizationId: 'office-a', visibility: 'ORGANIZATION', status: 'AVAILABLE' }
test('organization properties are visible only to their owner or current organization members', () => {
  for (const [actor, expected] of [[undefined, false], [{ id: 'outsider' }, false], [{ id: 'outsider', organizationId: 'office-b' }, false], [{ id: 'member', organizationId: 'office-a' }, true], [{ id: 'owner' }, true]]) {
    const where = permissions.propertyAudienceWhere(actor)
    assert.equal(matches(internal, where), expected)
    assert.equal(matches({ ...internal, visibility: 'PUBLIC' }, where), true)
    if (actor) assert.equal(matches(internal, permissions.visiblePropertyWhere(actor)), expected)
  }
  assert.equal(matches({ ...internal, organizationId: null }, permissions.propertyAudienceWhere({ id: 'outsider' })), false)
})
test('discovery applies the same audience to results and counts in grid, map and list', async () => {
  const queries = []
  const { propertyService } = load('services/property.service.ts', {
    '@/utils/propertyLocation': { publicPropertyLocation: value => value }, '@/lib/permissions': permissions, '@/lib/prisma': { prisma: { property: { findMany: async q => { queries.push(q.where); return [] }, count: async q => { queries.push(q.where); return 0 } } } },
  })
  const viewer = { id: 'outside', organizationId: 'office-b' }
  await propertyService.listProperties({ viewer })
  await propertyService.searchProperties({ viewer })
  await propertyService.searchProperties({ viewer, mapView: true, organizationId: 'office-a' })
  assert.equal(queries.length, 7)
  for (const where of queries) assert.equal(matches(internal, { OR: where.OR }), false)
})
test('publication uses persisted membership and rejects organization visibility without it', async () => {
  class ApiError extends Error { constructor(status, code, message) { super(message); this.statusCode = status } }
  const { propertyService } = load('services/property.service.ts', { '@/utils/errors': { ApiError } })
  const db = organizationId => ({ advisor: { findUnique: async () => ({ organizationId }) } })
  await assert.rejects(propertyService.publicationOrganization(db(null), 'owner', 'ORGANIZATION'), e => e.statusCode === 400)
  assert.equal(await propertyService.publicationOrganization(db('office-a'), 'owner', 'ORGANIZATION'), 'office-a')
  assert.equal(await propertyService.publicationOrganization(db(null), 'owner', 'PUBLIC'), null)
})
