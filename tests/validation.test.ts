import './setup'
import test from 'node:test'
import assert from 'node:assert/strict'
import { registrationFormSchema, loginSchema, profileSchema, passwordSchema, verifySchema } from '../packages/shared/src/validation/auth'
import { UserRole } from '../packages/shared/src/types'
import { sessionIsAllowed, hashSecret } from '../packages/backend/src/services/session.service'
import { availableSeats } from '../packages/backend/src/services/seats.service'
import { canRefreshRequest } from '../packages/frontend/src/utils/sessionIdentity'

const valid = { firstName: ' María  José ', lastName: " O’Neill Pérez ", email: ' User@Example.COM ', role: UserRole.ADVISOR, password: 'Una frase larga 2026', confirmPassword: 'Una frase larga 2026' }
test('registration preserves names and normalizes identity, but never alters passwords', () => {
  const data = registrationFormSchema.parse(valid)
  assert.equal(data.firstName, 'María José')
  assert.equal(data.lastName, 'O’Neill Pérez')
  assert.equal(data.email, 'user@example.com')
  assert.equal(data.password, valid.password)
  assert.equal(registrationFormSchema.safeParse({ ...valid, confirmPassword: 'otra' }).success, false)
})
test('rejects malformed API types, whitespace names, missing roles, invalid email and forbidden profile changes', () => {
  for (const input of [null, [], {}, { ...valid, firstName: 23 }, { ...valid, firstName: '  ' }, { ...valid, email: 'bad' }, { ...valid, role: 'DIRECTOR' }]) {
    assert.equal(registrationFormSchema.safeParse(input).success, false)
  }
  assert.equal(profileSchema.safeParse({ firstName: 'A', role: 'DIRECTOR' }).success, false)
  assert.equal(profileSchema.safeParse({ firstName: ' ' }).success, false)
  assert.equal(profileSchema.safeParse({ phone: '+59171234567' }).success, true)
  assert.equal(profileSchema.safeParse({ phone: '123abc' }).success, false)
})
test('new passwords are long enough and do not silently exceed bcrypt byte limits; legacy login remains possible', () => {
  assert.equal(passwordSchema.safeParse('short').success, false)
  assert.equal(passwordSchema.safeParse('a'.repeat(72)).success, true)
  assert.equal(passwordSchema.safeParse('a'.repeat(73)).success, false)
  assert.equal(passwordSchema.safeParse('é'.repeat(37)).success, false)
  assert.equal(passwordSchema.safeParse('😀'.repeat(6)).success, false)
  assert.equal(loginSchema.safeParse({ email: 'a@b.com', password: 'legacy' }).success, true)
})
test('codes are six digits and challenge identifiers are validated', () => {
  assert.equal(verifySchema.safeParse({ purpose: 'device', email: 'a@b.com', code: '123456', challengeId: 'invalid' }).success, false)
  assert.equal(verifySchema.safeParse({ purpose: 'signup', email: 'a@b.com', code: '12345' }).success, false)
})
test('an unexpired JWT cannot grant access to replaced, unapproved, wrong-account or blocked sessions', () => {
  const advisor = { userRole: 'ADVISOR', status: 'ACTIVE', activeSessionId: 'latest' }
  const latest = { id: 'latest', advisorId: 'u', revokedAt: null }
  assert.equal(sessionIsAllowed(advisor, latest, 'u'), true)
  assert.equal(sessionIsAllowed(advisor, { ...latest, id: 'old' }, 'u'), false)
  assert.equal(sessionIsAllowed(advisor, null, 'u'), false)
  assert.equal(sessionIsAllowed(advisor, latest, 'other'), false)
  assert.equal(sessionIsAllowed(advisor, { ...latest, revokedAt: new Date() }, 'u'), false)
  assert.equal(sessionIsAllowed({ ...advisor, status: 'BLOCKED' }, latest, 'u'), false)
  assert.equal(sessionIsAllowed({ ...advisor, userRole: 'BUYER' }, { ...latest, id: 'second' }, 'u'), true)
})
test('seat reservations count and available seats never become negative', () => {
  assert.equal(availableSeats(3, 1, 1), 1)
  assert.equal(availableSeats(3, 1, 2), 0)
  assert.equal(availableSeats(1, 4, 0), 0)
  assert.notEqual(hashSecret('browser-A'), hashSecret('browser-B'))
})
test('refreshing a request cannot replace its captured identity with another login session', () => {
  const token = (id: string, expiry: number) => 'header.' + Buffer.from(JSON.stringify({ session_id: id, exp: expiry })).toString('base64url') + '.signature'
  assert.equal(canRefreshRequest(token('session-a', 10), token('session-a', 20)), true)
  assert.equal(canRefreshRequest(token('session-a', 10), token('session-b', 20)), false)
  assert.equal(canRefreshRequest('invalid', token('session-b', 20)), false)
})
