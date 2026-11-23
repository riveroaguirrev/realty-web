import './setup'
import test, { type TestContext } from 'node:test'
import assert from 'node:assert/strict'
import { authService } from '../packages/backend/src/services/auth.service'
import { prisma } from '../packages/backend/src/lib/prisma'
import { supabase } from '../packages/backend/src/lib/supabase'
import { UserRole } from '../packages/shared/src/types'

const payload = { email: 'registration@example.com', password: 'Una frase segura para registro 2026', firstName: 'Valeria', lastName: 'Prueba', role: UserRole.ADVISOR }
const user = { id: '00000000-0000-4000-8000-000000000001', email: payload.email, email_confirmed_at: new Date().toISOString(), identities: [{ id: 'email' }], user_metadata: { firstName: payload.firstName, lastName: payload.lastName, role: payload.role } }

function setup(t: TestContext) {
  const previous = process.env.AUTH_REQUIRE_SIGNUP_VERIFICATION
  delete process.env.AUTH_REQUIRE_SIGNUP_VERIFICATION
  t.after(() => {
    if (previous === undefined) delete process.env.AUTH_REQUIRE_SIGNUP_VERIFICATION
    else process.env.AUTH_REQUIRE_SIGNUP_VERIFICATION = previous
  })
  t.mock.method(prisma, '$transaction', async (work: (tx: unknown) => unknown) => work({
    authRateLimit: { findUnique: async () => null, upsert: async () => ({}) },
  }))
}

test('temporary registration confirms only the new user and authorizes the registering browser without sending a code', async t => {
  setup(t)
  const create = t.mock.method(supabase.auth.admin, 'createUser', async () => ({ data: { user }, error: null }))
  t.mock.method(authService, 'ensureProfile', async () => ({ id: user.id }))
  const authorize = t.mock.method(authService, 'authorize', async () => ({ status: 'AUTHENTICATED', user: { id: user.id }, accessToken: 'access', refreshToken: 'refresh' }))
  const fetch = t.mock.method(globalThis, 'fetch', async (input: string, init: RequestInit) => {
    assert.equal(new URL(input).pathname, '/auth/v1/token')
    assert.equal(new URL(input).searchParams.get('grant_type'), 'password')
    assert.deepEqual(JSON.parse(String(init.body)), { email: payload.email, password: payload.password, gotrue_meta_security: {} })
    return Response.json({ user, access_token: 'access', refresh_token: 'refresh', expires_in: 3600, token_type: 'bearer' })
  })
  const result = await authService.signUp(payload, 'registering-browser')
  assert.equal(result.status, 'AUTHENTICATED')
  assert.deepEqual(create.mock.calls[0].arguments[0], {
    email: payload.email, password: payload.password, email_confirm: true,
    user_metadata: { firstName: payload.firstName, lastName: payload.lastName, role: payload.role },
  })
  assert.equal(fetch.mock.callCount(), 1, 'Only password sign-in should call the public Auth API')
  assert.equal(authorize.mock.calls[0].arguments[1], user.id)
  assert.equal(authorize.mock.calls[0].arguments[2], 'registering-browser')
})

test('temporary registration rejects an existing email without changing or signing into that account', async t => {
  setup(t)
  t.mock.method(supabase.auth.admin, 'createUser', async () => ({ data: { user: null }, error: { code: 'email_exists' } }))
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Existing accounts must not be signed in or modified') })
  const profile = t.mock.method(authService, 'ensureProfile', async () => { throw new Error('Existing profiles must not be modified') })
  await assert.rejects(authService.signUp(payload, 'browser'), { code: 'USER_ALREADY_EXISTS' })
  assert.equal(fetch.mock.callCount(), 0)
  assert.equal(profile.mock.callCount(), 0)
})

test('enabling signup verification restores the original email-code registration flow', async t => {
  setup(t)
  process.env.AUTH_REQUIRE_SIGNUP_VERIFICATION = 'true'
  const create = t.mock.method(supabase.auth.admin, 'createUser', async () => { throw new Error('Confirmed users must not be created when codes are required') })
  t.mock.method(authService, 'ensureProfile', async () => ({ id: user.id }))
  const authorize = t.mock.method(authService, 'authorize', async () => { throw new Error('Unverified signups must not receive an authorized session') })
  t.mock.method(globalThis, 'fetch', async (input: string) => {
    assert.equal(new URL(input).pathname, '/auth/v1/signup')
    return Response.json({ ...user, email_confirmed_at: undefined })
  })
  const result = await authService.signUp(payload, 'browser')
  assert.deepEqual(result, { status: 'EMAIL_VERIFICATION_REQUIRED', email: payload.email })
  assert.equal(create.mock.callCount(), 0)
  assert.equal(authorize.mock.callCount(), 0)
})

test('a failed sign-in after account creation returns a recoverable login message without authorizing a session', async t => {
  setup(t)
  t.mock.method(supabase.auth.admin, 'createUser', async () => ({ data: { user }, error: null }))
  t.mock.method(authService, 'ensureProfile', async () => ({ id: user.id }))
  const authorize = t.mock.method(authService, 'authorize', async () => { throw new Error('No session should be authorized') })
  t.mock.method(globalThis, 'fetch', async () => Response.json({ code: 'invalid_credentials', message: 'Invalid login' }, { status: 400 }))
  await assert.rejects(authService.signUp(payload, 'browser'), { code: 'REGISTRATION_LOGIN_FAILED' })
  assert.equal(authorize.mock.callCount(), 0)
})
