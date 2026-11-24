import './setup'
import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { NextRequest } from 'next/server'
import { prisma } from '../packages/backend/src/lib/prisma'
import { supabase, getSupabaseClient } from '../packages/backend/src/lib/supabase'
import { authService } from '../packages/backend/src/services/auth.service'
import { hashSecret } from '../packages/backend/src/services/session.service'
import { messageService } from '../packages/backend/src/services/message.service'
import { POST, GET as listMessages } from '../packages/backend/src/app/api/conversations/[id]/messages/route'
import { GET as getFile } from '../packages/backend/src/app/api/conversations/[id]/messages/[msgId]/attachments/[attachmentId]/route'

const integration = process.env.RUN_MESSAGE_INTEGRATION === '1'
if (integration && (![process.env.DATABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_URL].every(value => value && ['127.0.0.1', 'localhost'].includes(new URL(value).hostname)))) {
  throw new Error('Messaging integration tests require local database and storage.')
}

test('real private storage: send photo and PDF, receive them, reject outsiders and clean up on deletion', { skip: !integration, timeout: 30000 }, async t => {
  const users: string[] = []
  let conversationId = ''
  t.after(async () => {
    if (conversationId) {
      const messages = await prisma.message.findMany({ where: { conversationId } })
      for (const message of messages) await messageService.deleteMessage(message.id)
      await prisma.conversation.delete({ where: { id: conversationId } })
    }
    for (const id of users) {
      await prisma.advisor.deleteMany({ where: { id } })
      await supabase.auth.admin.deleteUser(id)
    }
    await prisma.$disconnect()
  })
  const createUser = async () => {
    const email = `message-file-${randomUUID()}@example.com`
    const password = `File-test-${randomUUID()}`
    const created = await supabase.auth.admin.createUser({ email, password, email_confirm: true })
    assert.ifError(created.error)
    const id = created.data.user!.id
    users.push(id)
    await prisma.advisor.upsert({ where: { id }, create: { id, email, firstName: 'Archivo', lastName: 'Prueba', specializations: [] }, update: {} })
    const session = await getSupabaseClient().auth.signInWithPassword({ email, password })
    assert.ifError(session.error)
    assert.ok(session.data.session)
    const browser = randomBytes(32).toString('hex')
    const authorized = await authService.authorize(session.data.session, id, hashSecret(browser))
    return { id, token: authorized.accessToken, browser }
  }
  const sender = await createUser()
  const recipient = await createUser()
  const outsider = await createUser()
  const conversation = await prisma.conversation.create({ data: { createdBy: sender.id, participants: { create: [{ advisorId: sender.id }, { advisorId: recipient.id }] } } })
  conversationId = conversation.id
  const form = new FormData()
  form.set('content', 'Fotos y contrato de prueba')
  form.append('files', new File(['%PDF-1.7\nLocal attachment test'], 'contrato.pdf', { type: 'application/pdf' }))
  const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#14243b' } }).png().toBuffer()
  form.append('files', new File([png], 'foto.png', { type: 'image/png' }))
  const request = (user: { token: string; browser: string }, method = 'GET', body?: FormData) =>
    new NextRequest('http://localhost/api/conversations/test/messages', {
      method,
      headers: { authorization: `Bearer ${user.token}`, cookie: `realty_browser=${user.browser}` },
      body,
    })
  const context = { params: Promise.resolve({ id: conversationId }) }
  const sent = await POST(request(sender, 'POST', form), context)
  const result = await sent.json()
  assert.equal(sent.status, 201, JSON.stringify(result.error))
  assert.equal(result.data.attachments.length, 2)
  const received = await listMessages(request(recipient), context)
  assert.equal((await received.json()).data[0].attachments.length, 2)
  assert.equal((await listMessages(request(outsider), context)).status, 403)
  const stored = result.data.attachments[0]
  const fileContext = { params: Promise.resolve({ id: conversationId, msgId: result.data.id, attachmentId: stored.id }) }
  assert.equal((await getFile(request(outsider), fileContext)).status, 403)
  const linksResponse = await getFile(request(recipient), fileContext)
  assert.equal(linksResponse.status, 200)
  const links = (await linksResponse.json()).data
  const downloaded = await fetch(links.downloadUrl)
  assert.equal(downloaded.status, 200)
  assert.match(downloaded.headers.get('content-disposition') || '', /attachment/)
  assert.equal(await downloaded.text(), '%PDF-1.7\nLocal attachment test')
  const publicUrl = supabase.storage.from('message-attachments').getPublicUrl(stored.path).data.publicUrl
  assert.ok(!(await fetch(publicUrl)).ok, 'Private documents must not have public access')
  await messageService.deleteMessage(result.data.id)
  assert.equal((await getFile(request(recipient), fileContext)).status, 404)
  const removed = await supabase.storage.from('message-attachments').download(stored.path)
  assert.ok(removed.error, 'Deleted messages must remove stored files')
})
