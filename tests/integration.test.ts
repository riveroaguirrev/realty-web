import './setup'
import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { prisma } from '../packages/backend/src/lib/prisma'
import { authService } from '../packages/backend/src/services/auth.service'
import { advisorService } from '../packages/backend/src/services/advisor.service'
import { organizationService } from '../packages/backend/src/services/organization.service'
import { messageService } from '../packages/backend/src/services/message.service'
import { activateSession, hashSecret, rateLimit, consumeChallenge } from '../packages/backend/src/services/session.service'
import { serializable } from '../packages/backend/src/lib/transactions'
import { UserRole } from '../packages/shared/src/types'
import { getSupabaseClient } from '../packages/backend/src/lib/supabase'

const integration = process.env.RUN_ACCOUNT_INTEGRATION === '1'
if (integration) {
  const target = new URL(process.env.DATABASE_URL!)
  if (target.hostname !== '127.0.0.1' || target.port !== '59941' || target.pathname !== '/postgres') {
    throw new Error('Refusing to run integration tests outside the isolated database')
  }
}
const unique = randomUUID().slice(0, 8)
const email = 'account-' + unique + '@example.com'
const password = 'Una frase larga segura 2026'
const browserA = hashSecret('browser-A-' + unique)
const browserB = hashSecret('browser-B-' + unique)
const expireMail = async (recipient: string) => {
  await prisma.authRateLimit.updateMany({ where: { key: hashSecret('mail:' + recipient) }, data: { resetAt: new Date(0) } })
  await new Promise((resolve) => setTimeout(resolve, 1100))
}
async function readableMessages(token: string, conversationId: string) {
  const jwt = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
  assert.equal(jwt.role, 'authenticated')
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET LOCAL ROLE authenticated')
    await tx.$queryRaw`SELECT set_config('request.jwt.claims', ${JSON.stringify(jwt)}, true), set_config('request.jwt.claim.sub', ${jwt.sub}, true)`
    return tx.$queryRaw<{ content: string }[]>`SELECT content FROM public."Message" WHERE "conversationId" = ${conversationId}`
  })
}
async function codeFor(recipient: string) {
  for (let i = 0; i < 30; i++) {
    const mails = await fetch('http://127.0.0.1:59942/test-mails').then((res) => res.json()) as { recipient: string; content: string }[]
    const mail = mails.filter((value) => value.recipient.toLowerCase() === recipient.toLowerCase()).at(-1)
    const html = mail?.content.replace(/=\r?\n/g, '').replace(/=([A-F0-9]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    const code = html?.match(/>\s*(\d{6})\s*</)?.[1]
    if (code) return code
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error('No verification code arrived at isolated SMTP')
}
test('real Supabase signup, device handover, recovery, bcrypt storage and double email confirmation', { skip: !integration }, async () => {
  const url = new URL(process.env.DATABASE_URL!)
  assert.equal(url.hostname, '127.0.0.1')
  assert.equal(url.port, '59941', 'Integration tests must use the isolated test database')
  const signup = await authService.signUp({ email, password, firstName: 'María José', lastName: 'Pérez', role: UserRole.ADVISOR, phone: '+59171234567' })
  assert.equal(signup.status, 'EMAIL_VERIFICATION_REQUIRED')
  assert.equal(await prisma.advisor.findUnique({ where: { email } }), null)
  assert.equal((await authService.signIn({ email, password }, browserA)).status, 'EMAIL_VERIFICATION_REQUIRED')
  const signupCode = await codeFor(email)
  await assert.rejects(authService.verify({ purpose: 'signup', email, code: '000000' }, browserA), { code: 'INVALID_CODE' })
  const first = await authService.verify({ purpose: 'signup', email, code: signupCode }, browserA)
  assert.equal(first.status, 'AUTHENTICATED')
  if (first.status !== 'AUTHENTICATED') throw new Error('No authorized session')
  assert.equal(first.user.phone, '+59171234567')
  const stored = await prisma.$queryRaw<{ encrypted_password: string }[]> `SELECT encrypted_password FROM auth.users WHERE id::text = ${first.user.id}`
  assert.match(stored[0].encrypted_password, /^\$2[aby]\$/)
  await assert.rejects(authService.verify({ purpose: 'signup', email, code: signupCode }, browserA), { code: 'INVALID_CODE' })
  assert.equal((await authService.getUserFromToken(first.accessToken)).role, UserRole.ADVISOR)
  await assert.rejects(authService.getUserFromToken(first.accessToken, browserB), { code: 'SESSION_REPLACED' })
  const conversation = await prisma.conversation.create({
    data: { createdBy: first.user.id, participants: { create: { advisorId: first.user.id } } },
  })
  await prisma.message.create({ data: { conversationId: conversation.id, senderId: first.user.id, content: 'Private test message' } })
  assert.equal((await readableMessages(first.accessToken, conversation.id)).length, 1)
  await authService.updateProfile(first.user, { phone: '+591 7234-5678', bio: 'Asesora' })
  assert.equal((await authService.getUserFromToken(first.accessToken)).phone, '+59172345678')
  await assert.rejects(authService.signIn({ email, password }, browserB), { code: 'RATE_LIMITED' })
  await expireMail(email)
  const pending = await authService.signIn({ email, password }, browserB)
  assert.equal(pending.status, 'DEVICE_VERIFICATION_REQUIRED')
  if (pending.status !== 'DEVICE_VERIFICATION_REQUIRED') throw new Error('Device challenge missing')
  assert.equal((await authService.getUserFromToken(first.accessToken)).id, first.user.id, 'Old session must remain usable until code succeeds')
  const deviceCode = await codeFor(email)
  await assert.rejects(authService.verify({ purpose: 'device', email, code: deviceCode, challengeId: pending.challengeId }, browserA), { code: 'INVALID_CODE' })
  const second = await authService.verify({ purpose: 'device', email, code: deviceCode, challengeId: pending.challengeId }, browserB)
  assert.equal(second.status, 'AUTHENTICATED')
  if (second.status !== 'AUTHENTICATED') throw new Error('Device authorization failed')
  await assert.rejects(authService.getUserFromToken(first.accessToken), { code: 'SESSION_REPLACED' })
  assert.equal((await readableMessages(first.accessToken, conversation.id)).length, 0, 'Realtime RLS must deny an old JWT immediately')
  assert.equal((await readableMessages(second.accessToken, conversation.id)).length, 1)
  await assert.rejects(authService.verify({ purpose: 'device', email, code: deviceCode, challengeId: pending.challengeId }, browserB), { code: 'INVALID_CODE' })
  await expireMail(email)
  await authService.resend({ purpose: 'recovery', email }, browserB)
  const recovery = await authService.verify({ purpose: 'recovery', email, code: await codeFor(email) }, browserB)
  assert.equal(recovery.status, 'PASSWORD_RESET_REQUIRED')
  if (recovery.status !== 'PASSWORD_RESET_REQUIRED') throw new Error('Recovery grant missing')
  await assert.rejects(authService.getUserFromToken(recovery.recoveryToken), { code: 'SESSION_REPLACED' })
  const newPassword = 'Una contraseña nueva segura 2026'
  await authService.resetPassword({ ...recovery, password: newPassword }, browserB)
  await assert.rejects(authService.resetPassword({ ...recovery, password: newPassword }, browserB), { code: 'INVALID_CODE' })
  await assert.rejects(authService.getUserFromToken(second.accessToken))
  const logged = await authService.signIn({ email, password: newPassword }, browserB)
  assert.equal(logged.status, 'AUTHENTICATED')
  if (logged.status !== 'AUTHENTICATED') throw new Error('Recovered browser should be authorized')
  await expireMail(email)
  const newEmail = 'changed-' + unique + '@example.com'
  const change = await authService.changeEmail(logged.accessToken, { email: newEmail, currentPassword: newPassword }, browserB)
  const oldConfirmation = await authService.verify({ purpose: 'email_change', email, code: await codeFor(email), challengeId: change.challengeId }, browserB, logged.accessToken)
  assert.equal(oldConfirmation.status, 'EMAIL_CHANGE_PENDING')
  assert.equal((await authService.getUserFromToken(logged.accessToken)).email, email)
  const final = await authService.verify({ purpose: 'email_change', email: newEmail, code: await codeFor(newEmail), challengeId: change.challengeId }, browserB, logged.accessToken)
  assert.ok(['AUTHENTICATED', 'EMAIL_CHANGED'].includes(final.status))
  assert.equal((await prisma.advisor.findUniqueOrThrow({ where: { id: first.user.id } })).email, newEmail)
  const current = await authService.signIn({ email: newEmail, password: newPassword }, browserB)
  assert.equal(current.status, 'AUTHENTICATED')
  if (current.status !== 'AUTHENTICATED') throw new Error('Missing current session')
  await authService.logout(current.accessToken)
  await assert.rejects(authService.getUserFromToken(current.accessToken))
})

test('an expired signup code can be resent without provisioning the advisor', { skip: !integration }, async () => {
  const email = 'resend-' + unique + '@example.com'
  await authService.signUp({ email, password, firstName: 'Ana', lastName: 'Prueba', role: UserRole.ADVISOR, phone: '+59171234567' })
  const expired = await codeFor(email)
  await prisma.$executeRaw`UPDATE auth.users SET confirmation_sent_at = NOW() - INTERVAL '11 minutes' WHERE email = ${email}`
  await prisma.$executeRaw`UPDATE auth.one_time_tokens SET created_at = NOW() - INTERVAL '11 minutes' WHERE user_id = (SELECT id FROM auth.users WHERE email = ${email})`
  await assert.rejects(authService.verify({ purpose: 'signup', email, code: expired }, browserA), { code: 'INVALID_CODE' })
  assert.equal(await prisma.advisor.findUnique({ where: { email } }), null)
  await expireMail(email)
  await authService.resend({ purpose: 'signup', email }, browserA)
  const result = await authService.verify({ purpose: 'signup', email, code: await codeFor(email) }, browserA)
  assert.equal(result.status, 'AUTHENTICATED')
})

test('concurrent invitations cannot overbook; expiry, cancellation, matching email and acceptance preserve seats', { skip: !integration }, async () => {
  const owner = await prisma.advisor.create({ data: { id: randomUUID(), email: 'owner-' + unique + '@example.com', firstName: 'Owner', lastName: 'Test', specializations: [] } })
  const org = await organizationService.createOrganization(owner.id, { name: 'Sucursal ' + unique, city: 'La Paz', region: 'La Paz' })
  await prisma.organization.update({ where: { id: org.id }, data: { maxAdvisors: 2 } })
  const outcomes = await Promise.allSettled([
    advisorService.sendInvite(org.id, 'invite-a-' + unique + '@example.com'),
    advisorService.sendInvite(org.id, 'invite-b-' + unique + '@example.com'),
  ])
  assert.equal(outcomes.filter((outcome) => outcome.status === 'fulfilled').length, 1)
  const success = outcomes.find((outcome) => outcome.status === 'fulfilled')
  if (!success || success.status !== 'fulfilled') throw new Error('No reserved invitation')
  const invite = success.value
  const rejected = outcomes.find((outcome) => outcome.status === 'rejected')
  assert.equal(rejected?.status === 'rejected' && rejected.reason.code, 'SEAT_LIMIT_REACHED')
  assert.equal((await organizationService.getOrganization(org.id)).seats.available, 0)
  const wrong = await prisma.advisor.create({ data: { id: randomUUID(), email: 'wrong-' + unique + '@example.com', firstName: 'Wrong', lastName: 'Test', specializations: [] } })
  await assert.rejects(advisorService.acceptInvite(invite.inviteCode, wrong.id), { code: 'INVITE_EMAIL_MISMATCH' })
  await advisorService.cancelInvite(org.id, invite.id)
  assert.equal((await organizationService.getOrganization(org.id)).seats.available, 1)
  const recreated = await advisorService.sendInvite(org.id, invite.email)
  await prisma.inviteCode.update({ where: { id: recreated.id }, data: { expiresAt: new Date(0) } })
  assert.equal((await organizationService.getOrganization(org.id)).seats.available, 1)
  const latest = await advisorService.sendInvite(org.id, invite.email)
  const recipient = await prisma.advisor.create({ data: { id: randomUUID(), email: invite.email, firstName: 'Asesor', lastName: 'Test', specializations: [] } })
  const accepted = await Promise.all([advisorService.acceptInvite(latest.inviteCode, recipient.id), advisorService.acceptInvite(latest.inviteCode, recipient.id)])
  assert.equal(accepted[0].organizationId, org.id)
  const seats = (await organizationService.getOrganization(org.id)).seats
  assert.deepEqual(seats, { limit: 2, occupied: 2, reserved: 0, available: 0 })
  await prisma.advisor.update({ where: { id: recipient.id }, data: { status: 'BLOCKED' } })
  assert.equal((await organizationService.getOrganization(org.id)).seats.occupied, 2)
  await advisorService.removeAdvisor(org.id, recipient.id)
  assert.equal((await organizationService.getOrganization(org.id)).seats.available, 1)
})
test('existing buyers retain multiple browsers and password change revokes old sessions', { skip: !integration }, async () => {
  const buyerEmail = 'buyer-' + unique + '@example.com'
  const native = await getSupabaseClient().auth.signUp({
    email: buyerEmail, password,
    options: { data: { firstName: 'Comprador', lastName: 'Test', role: UserRole.BUYER } },
  })
  assert.equal(native.error, null)
  const account = native.data.user!
  await assert.rejects(authService.ensureProfile(account), { code: 'EMAIL_NOT_VERIFIED' })
  await prisma.advisor.create({ data: {
    id: account.id, email: buyerEmail, firstName: 'Comprador', lastName: 'Test', userRole: 'BUYER', specializations: [],
  } })
  const first = await authService.verify({ purpose: 'signup', email: buyerEmail, code: await codeFor(buyerEmail) }, browserA)
  if (first.status !== 'AUTHENTICATED') throw new Error('Existing buyer authorization failed')
  assert.equal(first.user.role, UserRole.BUYER)
  assert.ok(!first.user.permissions?.includes('property:create' as never))
  const second = await authService.signIn({ email: buyerEmail, password }, browserB)
  if (second.status !== 'AUTHENTICATED') throw new Error('Buyer should not require a device challenge')
  assert.equal((await authService.getUserFromToken(first.accessToken, browserA)).id, first.user.id)
  assert.equal((await authService.getUserFromToken(second.accessToken, browserB)).id, first.user.id)
  await assert.rejects(authService.changePassword(second.accessToken, { currentPassword: 'incorrect', password: 'Una nueva frase segura 2026' }, browserB), { code: 'INVALID_CREDENTIALS' })
  const changed = await authService.changePassword(second.accessToken, { currentPassword: password, password: 'Una nueva frase segura 2026' }, browserB)
  assert.equal(changed.status, 'AUTHENTICATED')
  assert.equal((await authService.getUserFromToken(changed.accessToken, browserB)).id, first.user.id)
  await assert.rejects(authService.getUserFromToken(first.accessToken, browserA))
  await assert.rejects(authService.getUserFromToken(second.accessToken, browserB))
  const limits = await Promise.allSettled([rateLimit('concurrent-rate-' + unique, 1, 60), rateLimit('concurrent-rate-' + unique, 1, 60)])
  assert.equal(limits.filter((result) => result.status === 'fulfilled').length, 1)
  assert.equal(limits.find((result) => result.status === 'rejected')?.status, 'rejected')
})

test('recent chat history starts at the newest messages and older pages survive sends and cursor deletion', { skip: !integration }, async () => {
  const advisor = await prisma.advisor.create({ data: { id: randomUUID(), email: 'history-' + unique + '@example.com', firstName: 'Asesor', lastName: 'QA', specializations: [] } })
  const conversation = await prisma.conversation.create({ data: { createdBy: advisor.id } })
  const createdAt = new Date('2026-01-01T12:00:00Z')
  const ids = Array.from({ length: 53 }, (_, index) => 'history-' + unique + '-' + String(index).padStart(2, '0'))
  await prisma.message.createMany({ data: ids.map(id => ({ id, conversationId: conversation.id, senderId: advisor.id, content: id, createdAt })) })
  const first = await messageService.listRecentMessages(conversation.id, 50, null)
  assert.deepEqual(first.messages.map(message => message.id), ids.slice(3).reverse())
  const sent = await messageService.sendMessage(conversation.id, advisor.id, 'Nuevo mensaje')
  await messageService.deleteMessage(ids[3])
  const earlier = await messageService.listRecentMessages(conversation.id, 50, first.nextCursor)
  assert.deepEqual(earlier.messages.map(message => message.id), ids.slice(0, 3).reverse())
  assert.equal(earlier.nextCursor, null)
  assert.equal((await messageService.listRecentMessages(conversation.id, 50, null)).messages[0].id, sent.id)
})
test('concurrent session handovers yield exactly one active advisor session and invalidate old challenges', { skip: !integration }, async () => {
  const user = await prisma.advisor.create({ data: { id: randomUUID(), email: 'sessions-' + unique + '@example.com', firstName: 'Sessions', lastName: 'Test', specializations: [] } })
  for (let round = 0; round < 8; round++) {
    const ids = [randomUUID(), randomUUID()]
    await Promise.all(ids.map((id, index) => serializable((tx) => activateSession(tx, user.id, id, 'browser-' + index))))
    const sessions = await prisma.accountSession.findMany({ where: { advisorId: user.id, revokedAt: null } })
    assert.equal(sessions.length, 1)
    assert.ok(ids.includes(sessions[0].id))
    assert.equal((await prisma.advisor.findUniqueOrThrow({ where: { id: user.id } })).activeSessionId, sessions[0].id)
  }
  const challenge = await prisma.authChallenge.create({ data: { userId: user.id, email: user.email, purpose: 'device', browserHash: 'browser', expiresAt: new Date(Date.now() + 60000) } })
  await prisma.advisor.update({ where: { id: user.id }, data: { credentialsVersion: { increment: 1 } } })
  await assert.rejects(serializable((tx) => consumeChallenge(tx, challenge.id, 'browser', 'device')), { code: 'INVALID_CODE' })
  await rateLimit('rate-test-' + unique, 1, 60)
  await assert.rejects(rateLimit('rate-test-' + unique, 1, 60), { code: 'RATE_LIMITED' })
})
