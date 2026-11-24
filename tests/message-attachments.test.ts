import './setup'
import test, { type TestContext } from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { NextRequest } from 'next/server'
import { MAX_MESSAGE_FILE_BYTES, messageFilesError } from '../packages/shared/src/messageAttachments'
import { validateMessageFiles, readMessageForm } from '../packages/backend/src/utils/validateMessageFiles'
import { MessageAttachmentService, messageAttachmentService } from '../packages/backend/src/services/messageAttachment.service'
import { messageService } from '../packages/backend/src/services/message.service'
import { conversationService } from '../packages/backend/src/services/conversation.service'
import { authService } from '../packages/backend/src/services/auth.service'
import { ApiError } from '../packages/backend/src/utils/errors'
import { supabase } from '../packages/backend/src/lib/supabase'
import { POST } from '../packages/backend/src/app/api/conversations/[id]/messages/route'
import { GET } from '../packages/backend/src/app/api/conversations/[id]/messages/[msgId]/attachments/[attachmentId]/route'

const attachment = { id: 'file1', path: 'chat/file1.pdf', name: 'contrato.pdf', type: 'application/pdf', size: 20 }
const file = () => new File(['%PDF-1.7\nexample'], 'contrato.pdf', { type: 'application/pdf' })
const params = { params: Promise.resolve({ id: 'chat', msgId: 'message', attachmentId: attachment.id }) }
const request = (method = 'GET', body?: FormData | string) => new NextRequest('http://localhost/api/conversations/chat/messages/message/attachments/file1', { method, headers: { authorization: 'Bearer test', ...(typeof body === 'string' ? { 'content-type': 'application/json' } : {}) }, body })
function authenticate(t: TestContext) {
  t.mock.method(authService, 'getUserFromToken', async () => ({ id: 'advisor' }))
}
function storage(t: TestContext, failAt = 0) {
  const removed: string[][] = []
  let uploads = 0
  const bucket = {
    upload: async () => ({ error: ++uploads === failAt ? new Error('upload failure') : null }),
    remove: async (paths: string[]) => { removed.push(paths); return { error: null } },
  }
  t.mock.method(supabase.storage, 'getBucket', async () => ({ data: { id: 'message-attachments', public: false }, error: null }))
  t.mock.method(supabase.storage, 'from', () => bucket)
  return { removed, bucket }
}

test('attachment limits reject excessive count, aggregate size, empty files and unsafe formats', () => {
  assert.match(messageFilesError(Array.from({ length: 6 }, () => ({ name: 'a.pdf', size: 1 })))!, /5 archivos/)
  assert.match(messageFilesError([{ name: 'a.pdf', size: MAX_MESSAGE_FILE_BYTES }, { name: 'b.pdf', size: 1 }])!, /3 MB/)
  assert.match(messageFilesError([{ name: 'a.pdf', size: 0 }])!, /vacíos/)
  for (const name of ['a.svg', 'a.html', 'a.exe', 'a.pdf.exe']) assert.ok(messageFilesError([{ name, size: 10 }]))
  assert.equal(messageFilesError([{ name: 'A.PDF', size: 30 }, { name: 'foto.jpg', size: 50 }]), null)
})

test('file signatures reject fake PDF, office archives and images regardless of the client MIME', async () => {
  for (const name of ['fake.pdf', 'fake.docx', 'fake.doc', 'fake.png']) {
    await assert.rejects(validateMessageFiles([new File(['not the file type'], name, { type: 'application/octet-stream' })]))
  }
  await assert.rejects(validateMessageFiles([new File([new Uint8Array([65, 0, 66])], 'file.txt')]))
})

test('valid photos are decoded and re-encoded; PDF keeps a safe original filename', async () => {
  const bytes = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#d66d4c' } }).png().toBuffer()
  const result = await validateMessageFiles([new File([bytes], 'foto.png'), file()])
  assert.equal(result[0].type, 'image/png')
  assert.equal((await sharp(result[0].bytes).metadata()).width, 4)
  assert.equal(result[1].name, 'contrato.pdf')
  assert.equal(result[1].type, 'application/pdf')
})

test('multipart parsing rejects oversized bodies even with no content-length header', async () => {
  const oversized = new Request('http://localhost', {
    method: 'POST',
    headers: { 'content-type': 'multipart/form-data; boundary=test' },
    body: new Uint8Array(MAX_MESSAGE_FILE_BYTES + 140 * 1024),
  })
  assert.equal(oversized.headers.get('content-length'), null)
  await assert.rejects(readMessageForm(oversized), { statusCode: 413 })
})

test('uploads clean up previously saved files if a later attachment fails', async t => {
  const { removed } = storage(t, 2)
  const service = new MessageAttachmentService()
  await assert.rejects(service.upload('chat', [file(), file()]), { code: 'UPLOAD_FAILED' })
  assert.equal(removed.length, 1)
  assert.equal(removed[0].length, 1)
  assert.match(removed[0][0], /^chat\/[a-f0-9-]+\.pdf$/)
})

test('a public bucket fails closed instead of publishing chat files', async t => {
  t.mock.method(supabase.storage, 'getBucket', async () => ({ data: { public: true }, error: null }))
  const upload = t.mock.method(supabase.storage, 'from', () => { throw new Error('must not upload') })
  await assert.rejects(new MessageAttachmentService().upload('chat', [file()]), /privado/)
  assert.equal(upload.mock.callCount(), 0)
})

test('only a conversation participant can upload files', async t => {
  authenticate(t)
  t.mock.method(conversationService, 'requireParticipant', async () => {
    throw new ApiError(403, 'FORBIDDEN', 'Tu cuenta no participa en esta conversación.')
  })
  const upload = t.mock.method(messageAttachmentService, 'upload', async () => { throw new Error('must not upload') })
  const form = new FormData(); form.append('files', file())
  assert.equal((await POST(request('POST', form), params)).status, 403)
  assert.equal(upload.mock.callCount(), 0)
})

test('attachment-only messages are accepted and files are preserved in the saved message', async t => {
  authenticate(t)
  t.mock.method(conversationService, 'requireParticipant', async () => undefined)
  t.mock.method(messageAttachmentService, 'upload', async () => [attachment])
  const send = t.mock.method(messageService, 'sendMessage', async () => ({ id: 'message', attachments: [attachment] }))
  const form = new FormData(); form.append('files', file())
  const response = await POST(request('POST', form), params)
  assert.equal(response.status, 201)
  assert.deepEqual(send.mock.calls[0].arguments, ['chat', 'advisor', '', [attachment]])
})

test('a failed database write removes its uploaded files', async t => {
  authenticate(t)
  t.mock.method(conversationService, 'requireParticipant', async () => undefined)
  t.mock.method(messageAttachmentService, 'upload', async () => [attachment])
  t.mock.method(messageService, 'sendMessage', async () => { throw new Error('database failure') })
  t.mock.method(console, 'error', () => undefined)
  const remove = t.mock.method(messageAttachmentService, 'remove', async () => undefined)
  const form = new FormData(); form.append('files', file())
  assert.equal((await POST(request('POST', form), params)).status, 500)
  assert.deepEqual(remove.mock.calls[0].arguments[0], [attachment])
})

test('ordinary text messages still work and client-supplied attachment paths are rejected', async t => {
  authenticate(t)
  t.mock.method(conversationService, 'requireParticipant', async () => undefined)
  t.mock.method(messageAttachmentService, 'upload', async () => [])
  const send = t.mock.method(messageService, 'sendMessage', async () => ({ id: 'text' }))
  assert.equal((await POST(request('POST', JSON.stringify({ content: ' Hola ' })), params)).status, 201)
  assert.deepEqual(send.mock.calls[0].arguments, ['chat', 'advisor', 'Hola', []])
  assert.equal((await POST(request('POST', JSON.stringify({ content: 'Hola', attachments: [attachment] })), params)).status, 400)
  assert.equal((await POST(request('POST', JSON.stringify({ content: '' })), params)).status, 400)
})

test('downloads require authentication, membership and a matching message conversation', async t => {
  const anonymous = new NextRequest('http://localhost/api/file')
  assert.equal((await GET(anonymous, params)).status, 401)
  authenticate(t)
  const member = t.mock.method(conversationService, 'isParticipant', async () => false)
  const sign = t.mock.method(messageAttachmentService, 'signedUrl', async () => 'https://storage.example/signed')
  assert.equal((await GET(request(), params)).status, 403)
  member.mock.mockImplementation(async () => true)
  t.mock.method(messageService, 'getMessage', async () => ({ conversationId: 'other-chat', attachments: [attachment] }))
  assert.equal((await GET(request(), params)).status, 404)
  assert.equal(sign.mock.callCount(), 0)
})

test('participants receive short-lived download links without caching', async t => {
  authenticate(t)
  t.mock.method(conversationService, 'isParticipant', async () => true)
  t.mock.method(messageService, 'getMessage', async () => ({ conversationId: 'chat', attachments: [attachment] }))
  t.mock.method(messageAttachmentService, 'signedUrl', async () => 'https://storage.example/signed')
  const response = await GET(request(), params)
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
  assert.equal((await response.json()).data.downloadUrl, 'https://storage.example/signed')
})
