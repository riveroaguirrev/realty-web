import './setup'
import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const { NextRequest } = createRequire(resolve('packages/backend/package.json'))('next/server')
import { POST as register } from '../packages/backend/src/app/api/auth/register/route'
import { POST as login } from '../packages/backend/src/app/api/auth/login/route'
import { POST as action } from '../packages/backend/src/app/api/auth/[action]/route'
import { POST as uploadProfilePhoto } from '../packages/backend/src/app/api/auth/profile/photo/route'
import * as conversations from '../packages/backend/src/app/api/conversations/route'
import * as conversation from '../packages/backend/src/app/api/conversations/[id]/route'
import * as messages from '../packages/backend/src/app/api/conversations/[id]/messages/route'
import * as message from '../packages/backend/src/app/api/conversations/[id]/messages/[msgId]/route'
import { GET as downloadAttachment } from '../packages/backend/src/app/api/conversations/[id]/messages/[msgId]/attachments/[attachmentId]/route'
import { PUT as markRead } from '../packages/backend/src/app/api/conversations/[id]/mark-read/route'
import { authService } from '../packages/backend/src/services/auth.service'
import { hashSecret } from '../packages/backend/src/services/session.service'
import { Errors } from '../packages/backend/src/utils/errors'
test('authentication routes reject malformed JSON and invalid field types before any provider call', async () => {
  for (const [handler, body] of [[register, 'null'], [register, '{"email":12}'], [login, '{bad']] as const) {
    const response = await handler(new NextRequest('http://localhost:3000/api/auth/register', { method: 'POST', body, headers: { 'content-type': 'application/json' } }))
    assert.equal(response.status, 400)
    assert.equal((await response.json()).error.code, 'VALIDATION_ERROR')
    assert.equal(response.headers.get('cache-control'), 'no-store')
  }
})

test('register rejects a new buyer before invoking the registration service', async (t) => {
  const signUp = t.mock.method(authService, 'signUp', () => { throw new Error('Unexpected registration') })
  const response = await register(new NextRequest('http://localhost/api/auth/register', {
    method: 'POST', body: JSON.stringify({
      firstName: 'Asesor', lastName: 'QA', email: 'buyer@example.com', password: 'A long test password', role: 'BUYER',
    }),
  }))
  assert.equal(response.status, 400)
  assert.ok((await response.json()).error.fieldErrors.role.length)
  assert.equal(signUp.mock.callCount(), 0)
})

test('conversation endpoints and profile photo uploads enforce browser-bound authorization', async (t) => {
  const secret = 'a'.repeat(64)
  const params = Promise.resolve({ id: 'conversation', msgId: 'message', attachmentId: 'file' })
  const handlers = [
    [conversations.GET, 'GET'], [conversations.POST, 'POST'], [conversation.GET, 'GET'],
    [messages.GET, 'GET'], [messages.POST, 'POST'], [message.PUT, 'PUT'], [message.DELETE, 'DELETE'],
    [markRead, 'PUT'], [downloadAttachment, 'GET'], [uploadProfilePhoto, 'POST'],
  ] as const
  const verify = t.mock.method(authService, 'getUserFromToken', async (token, browserHash) => {
    assert.equal(token, 'test-session')
    assert.equal(browserHash, hashSecret(secret))
    throw Errors.SESSION_REPLACED
  })
  for (const [handler, method] of handlers) {
    const response = await handler(new NextRequest('http://localhost/api/qa', {
      method, headers: { Authorization: 'Bearer test-session', Cookie: 'realty_browser=' + secret },
    }), { params })
    assert.equal(response.status, 401)
    assert.equal((await response.json()).error.code, 'SESSION_REPLACED')
  }
  assert.equal(verify.mock.callCount(), handlers.length)
})
test('credential changes and logout require authentication; untrusted browser origins are rejected', async () => {
  const response = await action(new NextRequest('http://localhost:3000/api/auth/password', {
    method: 'POST', body: JSON.stringify({ currentPassword: 'old', password: 'A long new password', confirmPassword: 'A long new password' }),
  }), { params: Promise.resolve({ action: 'password' }) })
  assert.equal(response.status, 401)
  const rejected = await login(new NextRequest('http://localhost:3000/api/auth/login', {
    method: 'POST', body: '{}', headers: { origin: 'https://untrusted.example' },
  }))
  assert.equal(rejected.status, 403)
  assert.equal(rejected.headers.get('set-cookie'), null)
})
