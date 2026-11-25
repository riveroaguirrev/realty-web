const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
function load(file, imports) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText
  const mod = { exports: {} }
  new Function('require', 'module', 'exports', source)(name => {
    if (name in imports) return imports[name]
    if (name === '@/utils/errors') return { ApiError: class extends Error {} }
    return {}
  }, mod, mod.exports)
  return mod.exports
}
const date = new Date('2026-11-25T12:00:00Z')
test('sending text or attachments stores a bell and push notice for active recipients, not the sender', async () => {
  for (const content of ['Hola', '']) {
    let audience, created
    const tx = {
      message: { create: async () => ({ id: 'm', createdAt: date, sender: { firstName: 'Lucía', lastName: 'Mendoza' } }) },
      conversation: { updateMany: async () => {} },
      conversationParticipant: { findMany: async args => { audience = args.where; return [{ advisorId: 'recipient' }] } },
      notification: { createMany: async args => { created = args.data } },
    }
    const api = load('services/message.service.ts', { '@/lib/prisma': { prisma: { $transaction: fn => fn(tx) } } })
    await api.messageService.sendMessage('chat', 'sender', content, [])
    assert.deepEqual(audience, { conversationId: 'chat', advisorId: { not: 'sender' }, advisor: { status: 'ACTIVE' } })
    assert.equal(created.length, 1)
    assert.equal(created[0].advisorId, 'recipient')
    assert.equal(created[0].channel, 'PUSH')
    assert.equal(created[0].relatedEntityId, 'm')
    assert.equal(created[0].relatedEntityType, 'message')
    assert.equal(created[0].actionUrl, '/messages/chat')
    assert.equal(created[0].message, content || 'Archivo adjunto')
    assert.equal(created[0].createdAt, date)
  }
})
test('a notification persistence failure aborts the same message transaction', async () => {
  const tx = { message: { create: async () => ({ id: 'm', createdAt: date, sender: { firstName: 'A', lastName: 'B' } }) }, conversation: { updateMany: async () => {} }, conversationParticipant: { findMany: async () => [{ advisorId: 'b' }] }, notification: { createMany: async () => { throw Error('outbox unavailable') } } }
  const api = load('services/message.service.ts', { '@/lib/prisma': { prisma: { $transaction: fn => fn(tx) } } })
  await assert.rejects(api.messageService.sendMessage('chat', 'a', 'Hola'), /outbox unavailable/)
})
test('reading through a message clears only this recipient and conversation up to that timestamp', async () => {
  let notice
  const tx = { conversationParticipant: { updateMany: async () => ({ count: 1 }) }, notification: { updateMany: async args => { notice = args } } }
  const db = { message: { findUnique: async () => ({ createdAt: date }) }, $transaction: fn => fn(tx) }
  const api = load('services/conversation.service.ts', { '@/lib/prisma': { prisma: db } })
  await api.conversationService.markAsRead('chat', 'recipient', 'm')
  assert.equal(notice.where.advisorId, 'recipient')
  assert.equal(notice.where.relatedEntityType, 'message')
  assert.deepEqual(notice.where.data, { path: ['conversationId'], equals: 'chat' })
  assert.equal(notice.where.createdAt.lte, date)
  assert.equal(notice.data.scheduledFor, null)
  assert.equal(notice.data.isRead, true)
})
function pushDB(allowed) {
  const calls = { sent: [], retired: [] }
  const db = {
    notification: { findMany: async args => { calls.query = args; return [{ id: 'n', advisorId: 'recipient', type: 'SYSTEM', relatedEntityType: 'message', relatedEntityId: 'm', title: 'Mensaje', message: 'Hola', actionUrl: '/messages/chat', sendAttempts: 0 }] }, updateMany: async args => { calls.retired.push(args); return { count: 1 } }, update: async () => {} },
    message: { findUnique: async () => ({ conversationId: 'chat', senderId: 'sender', createdAt: date }) },
    conversationParticipant: { findFirst: async args => { calls.access = args.where; return allowed ? { id: 'member' } : null } },
    pushSubscription: { findMany: async () => [{ endpoint: 'https://push.example', p256dh: 'key', auth: 'auth' }] },
  }
  return { db, calls }
}
for (const allowed of [true, false]) test(allowed ? 'push reaches unread message recipients with a direct chat URL' : 'push is discarded when the recipient left or already read the message', async () => {
  const old = { ...process.env }
  Object.assign(process.env, { VAPID_PUBLIC_KEY: 'test', VAPID_PRIVATE_KEY: 'test', VAPID_SUBJECT: 'mailto:test@example.com' })
  try {
    const { db, calls } = pushDB(allowed)
    const api = load('services/push.service.ts', { '@/lib/prisma': { prisma: db }, 'web-push': { setVapidDetails() {}, async sendNotification(_, payload) { calls.sent.push(JSON.parse(payload)) } } })
    const result = await api.deliverPendingPush()
    assert.equal(result.sent, allowed ? 1 : 0)
    assert.equal(calls.query.where.isRead, false)
    assert.equal(calls.access.advisorId, 'recipient')
    assert.equal(calls.access.lastReadAt.lt, date)
    if (allowed) assert.equal(calls.sent[0].url, '/messages/chat')
    else assert.equal(calls.retired.at(-1).data.scheduledFor, null)
  } finally {
    for (const key of ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT']) if (old[key] === undefined) delete process.env[key]; else process.env[key] = old[key]
  }
})
test('the bell returns both types and excludes messages without current conversation access', async () => {
  const items = [
    { id: 'rn', type: 'REQUIREMENT_CREATED', relatedEntityType: 'requirement', relatedEntityId: 'r', actionUrl: '/requirements/r' },
    { id: 'mn', type: 'SYSTEM', relatedEntityType: 'message', relatedEntityId: 'm', actionUrl: '/messages/chat' },
    { id: 'hidden', type: 'SYSTEM', relatedEntityType: 'message', relatedEntityId: 'other', actionUrl: '/messages/other' },
  ]
  const db = { notification: { findMany: async () => items }, requirement: { findMany: async () => [{ id: 'r' }] }, message: { findMany: async args => { assert.equal(args.where.conversation.participants.some.advisorId, 'recipient'); return [{ id: 'm' }] } } }
  const api = load('app/api/notifications/route.ts', {
    '@/lib/prisma': { prisma: db }, 'next/server': { NextResponse: { json: value => value } },
    '@/utils/authenticatedRoute': { authenticatedRoute: (_, fn) => fn('recipient') },
    '@/services/requirement.service': { requirementAccess: async () => ({}) },
  })
  const response = await api.GET({})
  assert.deepEqual(response.data.map(item => [item.id, item.kind]), [['rn', 'requirement'], ['mn', 'message']])
})
