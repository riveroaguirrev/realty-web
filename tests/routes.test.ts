import './setup'
import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const { NextRequest } = createRequire(resolve('packages/backend/package.json'))('next/server')
import { POST as register } from '../packages/backend/src/app/api/auth/register/route'
import { POST as login } from '../packages/backend/src/app/api/auth/login/route'
import { POST as action } from '../packages/backend/src/app/api/auth/[action]/route'
test('authentication routes reject malformed JSON and invalid field types before any provider call', async () => {
  for (const [handler, body] of [[register, 'null'], [register, '{"email":12}'], [login, '{bad']] as const) {
    const response = await handler(new NextRequest('http://localhost:3000/api/auth/register', { method: 'POST', body, headers: { 'content-type': 'application/json' } }))
    assert.equal(response.status, 400)
    assert.equal((await response.json()).error.code, 'VALIDATION_ERROR')
    assert.equal(response.headers.get('cache-control'), 'no-store')
  }
})
test('credential changes and logout require authentication; untrusted browser origins are rejected', async () => {
  const response = await action(new NextRequest('http://localhost:3000/api/auth/password', {
    method: 'POST', body: JSON.stringify({ currentPassword: 'old', password: 'A long new password', confirmPassword: 'A long new password' }),
  }), { params: { action: 'password' } })
  assert.equal(response.status, 401)
  const rejected = await login(new NextRequest('http://localhost:3000/api/auth/login', {
    method: 'POST', body: '{}', headers: { origin: 'https://untrusted.example' },
  }))
  assert.equal(rejected.status, 403)
  assert.equal(rejected.headers.get('set-cookie'), null)
})
