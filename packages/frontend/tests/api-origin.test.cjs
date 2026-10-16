const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
function load(name, env, mocks) {
  const source = fs.readFileSync(path.resolve(__dirname, `../src/services/${name}.ts`), 'utf8').replaceAll('import.meta.env', JSON.stringify(env))
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText
  const loaded = { exports: {} }
  new Function('require', 'module', 'exports', compiled)(id => {
    if (id in mocks) return mocks[id]
    throw new Error(`Unexpected dependency ${id}`)
  }, loaded, loaded.exports)
  return loaded.exports
}
for (const [label, env, expected] of [
  ['local development', { DEV: true, VITE_API_URL: 'http://localhost:3000/api' }, '/api'],
  ['configured production', { DEV: false, VITE_API_URL: 'https://api.example.test/api' }, 'https://api.example.test/api'],
  ['same-origin production', { DEV: false }, '/api'],
]) {
  test(`all REST services use the correct origin in ${label}`, async () => {
    let config
    const client = { interceptors: { request: { use() {} }, response: { use() {} } } }
    const axios = { create: options => { config = options; return client } }
    const api = load('api', env, {
      axios, './supabase': { supabase: {} }, '@/utils/sessionIdentity': {},
    })
    assert.equal(config.baseURL, expected)
    assert.equal(config.withCredentials, true)
    assert.equal(api.httpClient, client)
    for (const name of ['propertySearch', 'messages', 'favorites', 'conversations', 'organization']) {
      load(name, env, { './api': api })
    }
    const urls = []
    const transport = { get: async url => { urls.push(url); return { data: { success: true, data: [], meta: { total: 0, locatedTotal: 0, limit: 2000 } } } } }
    await load('propertyMap', env, { axios: transport }).searchMapProperties('demo-token', {})
    await load('matching', env, { axios: transport }).matchingAPI.getSimilarProperties('demo-property')
    assert.equal(urls.length, 2)
    assert.ok(urls.every(url => url.startsWith(`${expected}/properties/`)))
  })
}
