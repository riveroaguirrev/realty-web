const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
function load(name, env, axios) {
  const source = fs.readFileSync(path.resolve(__dirname, `../src/services/${name}.ts`), 'utf8').replaceAll('import.meta.env', JSON.stringify(env))
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText
  const loaded = { exports: {} }
  new Function('require', 'module', 'exports', compiled)(id => { if (id === 'axios') return axios; throw new Error(`Unexpected dependency ${id}`) }, loaded, loaded.exports)
  return loaded.exports
}
for (const [label, env, expected] of [
  ['local development', { DEV: true, VITE_API_URL: 'http://localhost:3000/api' }, '/api'],
  ['configured production', { DEV: false, VITE_API_URL: 'https://api.example.test/api' }, 'https://api.example.test/api'],
  ['same-origin production', { DEV: false }, '/api'],
]) {
  test(`all REST services use the correct origin in ${label}`, async () => {
    for (const name of ['api', 'propertySearch', 'messages', 'favorites', 'conversations', 'organization']) {
      let config
      load(name, env, { create: options => { config = options; return { interceptors: { response: { use() {} } } } } })
      assert.equal(config.baseURL, expected, name)
    }
    const urls = []
    const axios = { get: async url => { urls.push(url); return { data: { success: true, data: [], meta: { total: 0, locatedTotal: 0, limit: 2000 } } } } }
    await load('propertyMap', env, axios).searchMapProperties('demo-token', {})
    await load('matching', env, axios).matchingAPI.getSimilarProperties('demo-property')
    assert.equal(urls.length, 2)
    assert.ok(urls.every(url => url.startsWith(`${expected}/properties/`)))
  })
}
