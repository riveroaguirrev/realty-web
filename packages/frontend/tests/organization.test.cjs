const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

function loadTS(file, mocks, env = {}) {
  const source = fs.readFileSync(path.resolve(__dirname, file), 'utf8')
    .replaceAll('import.meta.env', JSON.stringify(env))
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', compiled)(
    id => mocks[id] || require(id), module, module.exports,
  )
  return module.exports
}

test('organization requests use the shared authenticated client', async () => {
  let request
  const { organizationAPI } = loadTS('../src/services/organization.ts', {
    './api': { httpClient: { get: async (url, config) => { request = { url, config }; return { data: { success: true, data: [] } } } } },
  })
  await organizationAPI.listInvites('test-token', 'org')
  assert.equal(request.url, '/organizations/org/invites')
  assert.equal(request.config.headers.Authorization, 'Bearer test-token')
})

test('retry recovers organization and members after a network failure', async () => {
  const state = { organization: null, advisors: [], isLoading: false, error: null }
  const store = { ...state }
  for (const key of Object.keys(state)) {
    store[`set${key[0].toUpperCase()}${key.slice(1)}`] = value => { state[key] = value }
  }
  const networkError = Object.assign(new Error('Network Error'), { isAxiosError: true })
  const org = { id: 'org', advisors: [{ id: 'advisor' }] }
  let requests = 0
  const { useOrganization } = loadTS('../src/hooks/useOrganization.ts', {
    react: { useCallback: callback => callback },
    './useAuth': { useAuth: () => ({ accessToken: 'test-token' }) },
    '@/stores/organizationStore': { useOrganizationStore: () => store },
    '@/services/organization': { organizationAPI: { get: async (token, id) => {
      assert.equal(token, 'test-token')
      assert.equal(id, 'org')
      if (++requests === 1) throw networkError
      return org
    } } },
  })
  const { getOrganization } = useOrganization()
  await assert.rejects(getOrganization('org'), networkError)
  assert.match(state.error, /conectar con el servidor/)
  assert.equal(state.isLoading, false)
  await getOrganization('org')
  assert.equal(state.organization, org)
  assert.deepEqual(state.advisors, org.advisors)
  assert.equal(state.error, null)
  assert.equal(state.isLoading, false)
})
