import './setup'
import test, { type TestContext } from 'node:test'
import assert from 'node:assert/strict'
import { authService } from '../packages/backend/src/services/auth.service'
import { prisma } from '../packages/backend/src/lib/prisma'
import { supabase } from '../packages/backend/src/lib/supabase'
import { UserRole } from '../packages/shared/src/types'

const payload = {
  email: 'registration@example.com', password: 'Una frase segura para registro 2026',
  firstName: 'Valeria', lastName: 'Prueba', role: UserRole.ADVISOR as const, phone: '+59171234567',
}
const { email, password, ...metadata } = payload
const user = {
  id: '00000000-0000-4000-8000-000000000001', email,
  confirmation_sent_at: '2026-01-01T12:00:00.000Z', email_confirmed_at: '2026-01-01T12:01:00.000Z',
  identities: [{ id: 'email' }], user_metadata: metadata,
}

function mockRateLimit(t: TestContext) {
  t.mock.method(prisma, '$transaction', async (work: (tx: unknown) => unknown) => work({
    authRateLimit: { findUnique: async () => null, upsert: async () => ({}) },
  }))
}

function mockDelegate(t: TestContext, name: 'advisor' | 'authChallenge', delegate: object) {
  Object.defineProperty(prisma, name, { value: delegate, configurable: true })
  t.after(() => Reflect.deleteProperty(prisma, name))
}

test('signup sends the number with the email request and leaves profile and session pending', async t => {
  mockRateLimit(t)
  const create = t.mock.method(supabase.auth.admin, 'createUser', async () => { throw new Error('Unexpected admin signup') })
  const profile = t.mock.method(authService, 'ensureProfile', async () => { throw new Error('Unexpected local profile') })
  const authorize = t.mock.method(authService, 'authorize', async () => { throw new Error('Unexpected session') })
  const request = t.mock.method(globalThis, 'fetch', async (input: string, init: RequestInit) => {
    assert.equal(new URL(input).pathname, '/auth/v1/signup')
    assert.deepEqual(JSON.parse(String(init.body)), {
      email, password, data: metadata, gotrue_meta_security: {}, code_challenge: null, code_challenge_method: null,
    })
    return Response.json({ ...user, email_confirmed_at: undefined })
  })
  assert.deepEqual(await authService.signUp(payload), { status: 'EMAIL_VERIFICATION_REQUIRED', email })
  assert.equal(request.mock.callCount(), 1)
  assert.equal(create.mock.callCount(), 0)
  assert.equal(profile.mock.callCount(), 0)
  assert.equal(authorize.mock.callCount(), 0)
})

test('signup responds the same for an existing email without modifying its profile', async t => {
  mockRateLimit(t)
  const profile = t.mock.method(authService, 'ensureProfile', async () => { throw new Error('Unexpected local profile') })
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error_code: 'user_already_exists', message: 'Existing user' }, { status: 422 }))
  assert.deepEqual(await authService.signUp(payload), { status: 'EMAIL_VERIFICATION_REQUIRED', email })
  assert.equal(profile.mock.callCount(), 0)
})

test('signup revokes an unexpected provider session and rejects the unverified profile', async t => {
  mockRateLimit(t)
  const revoke = t.mock.method(supabase.auth.admin, 'signOut', async () => ({ data: null, error: null }))
  const store = t.mock.fn(async () => { throw new Error('Unexpected profile creation') })
  mockDelegate(t, 'advisor', { upsert: store, findUnique: async () => null })
  const autoConfirmed = { ...user, confirmation_sent_at: undefined }
  t.mock.method(globalThis, 'fetch', async () => Response.json({
    user: autoConfirmed, access_token: 'unexpected-access', refresh_token: 'unexpected-refresh', expires_in: 3600, token_type: 'bearer',
  }))
  await assert.rejects(authService.signUp(payload), { code: 'AUTH_CONFIGURATION_ERROR' })
  assert.deepEqual(revoke.mock.calls[0].arguments, ['unexpected-access', 'local'])
  await assert.rejects(authService.ensureProfile(autoConfirmed as Parameters<typeof authService.ensureProfile>[0]), { code: 'EMAIL_NOT_VERIFIED' })
  assert.equal(store.mock.callCount(), 0)
})

test('new profiles persist the normalized signup phone and existing profiles can lack one', async t => {
  const lookup = t.mock.fn(async (): Promise<{ id: string; email: string; phone: null } | null> => null)
  const store = t.mock.fn(async (args: { create: { phone: string } }) => args.create)
  mockDelegate(t, 'advisor', { upsert: store, findUnique: lookup })
  const providerUser = {
    ...user, user_metadata: { ...metadata, phone: '+591 (7123) 4567' },
  } as Parameters<typeof authService.ensureProfile>[0]
  await authService.ensureProfile(providerUser)
  assert.equal(store.mock.calls[0].arguments[0].create.phone, '+59171234567')
  await assert.rejects(
    authService.ensureProfile({ ...providerUser, user_metadata: { ...metadata, phone: undefined } }),
    { code: 'PROFILE_INCOMPLETE' },
  )
  const legacy = { id: user.id, email, phone: null }
  lookup.mock.mockImplementation(async () => legacy)
  assert.deepEqual(await authService.ensureProfile({ ...providerUser, confirmation_sent_at: undefined }), legacy)
  assert.equal(store.mock.callCount(), 1)
})

test('resending a device code checks browser and account and only extends a pending challenge', async t => {
  mockRateLimit(t)
  const challenge = {
    id: '00000000-0000-4000-8000-000000000002', email, purpose: 'device',
    browserHash: 'registered-browser', userId: user.id, expiresAt: new Date(Date.now() + 30_000),
    credentialsVersion: 2, consumedAt: null,
  }
  const updateMany = t.mock.fn(async (_args: { where: object }) => ({ count: 1 }))
  mockDelegate(t, 'authChallenge', { findUnique: async () => challenge, updateMany })
  const lookup = t.mock.fn(async () => ({ credentialsVersion: 2, status: 'ACTIVE' }))
  mockDelegate(t, 'advisor', { findUnique: lookup })
  const send = t.mock.method(globalThis, 'fetch', async (input: string) => {
    assert.equal(new URL(input).pathname, '/auth/v1/otp')
    return Response.json({})
  })
  const input = { purpose: 'device' as const, email, challengeId: challenge.id }
  await assert.rejects(authService.resend(input, 'wrong-browser'), { code: 'INVALID_CODE' })
  lookup.mock.mockImplementationOnce(async () => ({ credentialsVersion: 3, status: 'ACTIVE' }))
  await assert.rejects(authService.resend(input, challenge.browserHash), { code: 'INVALID_CODE' })
  assert.equal(send.mock.callCount(), 0)
  await authService.resend(input, challenge.browserHash)
  assert.equal(send.mock.callCount(), 1)
  const { where } = updateMany.mock.calls[0].arguments[0]
  assert.deepEqual(where, {
    id: challenge.id, userId: user.id, purpose: 'device', browserHash: challenge.browserHash,
    credentialsVersion: 2, consumedAt: null, expiresAt: { gt: (where as { expiresAt: { gt: Date } }).expiresAt.gt },
  })
  updateMany.mock.mockImplementationOnce(async () => ({ count: 0 }))
  await assert.rejects(authService.resend(input, challenge.browserHash), { code: 'INVALID_CODE' })
})
