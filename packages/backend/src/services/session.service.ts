import { createHash, randomBytes } from 'node:crypto'
import { decode } from 'jsonwebtoken'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { serializable } from '@/lib/transactions'
import { ApiError, Errors } from '@/utils/errors'

export const hashSecret = (value: string) => createHash('sha256').update(value).digest('hex')
export const newBrowserSecret = () => randomBytes(32).toString('hex')
// Called only AFTER Supabase has authenticated the JWT. Decoding alone never grants access.
export function sessionId(token: string): string {
  const claims = decode(token)
  const id = typeof claims === 'object' && claims ? claims.session_id : undefined
  if (typeof id !== 'string' || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) throw Errors.INVALID_TOKEN
  return id
}
export function sessionIsAllowed(
  advisor: { userRole: string; activeSessionId: string | null; status: string },
  session: { id: string; advisorId: string; revokedAt: Date | null } | null,
  userId: string,
): boolean {
  return !!session && session.advisorId === userId && !session.revokedAt &&
    advisor.status !== 'BLOCKED' && advisor.status !== 'INACTIVE' &&
    (advisor.userRole === 'BUYER' || advisor.activeSessionId === session.id)
}
export async function activateSession(
  tx: Prisma.TransactionClient, userId: string, id: string, browserHash: string, revokeAll = false, trustedBrowserOnly = false,
) {
  const advisor = await tx.advisor.findUniqueOrThrow({ where: { id: userId } })
  if (advisor.status === 'BLOCKED' || advisor.status === 'INACTIVE') throw Errors.ACCOUNT_BLOCKED
  if (trustedBrowserOnly && advisor.userRole === 'ADVISOR' && advisor.authorizedBrowserHash !== browserHash) {
    throw new ApiError(409, 'DEVICE_VERIFICATION_REQUIRED', 'El navegador autorizado cambió. Inicia sesión de nuevo para solicitar un código.')
  }
  if (advisor.userRole === 'ADVISOR' || revokeAll) {
    await tx.accountSession.updateMany({ where: { advisorId: userId, revokedAt: null, id: { not: id } }, data: { revokedAt: new Date() } })
  }
  // Never reactivate an old revoked JWT through refresh or replay.
  const existing = await tx.accountSession.findUnique({ where: { id } })
  if (existing?.revokedAt || (existing && existing.advisorId !== userId)) throw Errors.SESSION_REPLACED
  await tx.accountSession.upsert({
    where: { id }, update: {}, create: { id, advisorId: userId, browserHash },
  })
  return tx.advisor.update({
    where: { id: userId },
    data: { activeSessionId: advisor.userRole === 'ADVISOR' ? id : undefined, authorizedBrowserHash: browserHash, lastLoginAt: new Date() },
    include: { organization: true },
  })
}
export async function consumeChallenge(tx: Prisma.TransactionClient, id: string, browserHash: string, purpose: string) {
  const challenge = await tx.authChallenge.findUnique({ where: { id } })
  if (!challenge || challenge.browserHash !== browserHash || challenge.purpose !== purpose ||
    challenge.consumedAt || challenge.expiresAt <= new Date()) throw Errors.INVALID_CODE
  const advisor = await tx.advisor.findUniqueOrThrow({ where: { id: challenge.userId } })
  if (advisor.credentialsVersion !== challenge.credentialsVersion) throw Errors.INVALID_CODE
  const claimed = await tx.authChallenge.updateMany({
    where: { id, consumedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() },
  })
  if (claimed.count !== 1) throw Errors.INVALID_CODE
  return challenge
}
export async function rateLimit(key: string, limit: number, seconds: number) {
  await serializable(async (tx) => {
    const hashed = hashSecret(key)
    const now = new Date()
    const current = await tx.authRateLimit.findUnique({ where: { key: hashed } })
    if (current && current.resetAt > now && current.hits >= limit) {
      throw new ApiError(429, 'RATE_LIMITED', 'Has realizado demasiados intentos. Espera antes de volver a intentarlo.')
    }
    await tx.authRateLimit.upsert({
      where: { key: hashed },
      create: { key: hashed, hits: 1, resetAt: new Date(now.getTime() + seconds * 1000) },
      update: current && current.resetAt > now
        ? { hits: { increment: 1 } }
        : { hits: 1, resetAt: new Date(now.getTime() + seconds * 1000) },
    })
  })
}
export async function getChallenge(id: string | undefined, browserHash: string, purpose: string) {
  if (!id) throw Errors.INVALID_CODE
  const challenge = await prisma.authChallenge.findUnique({ where: { id } })
  if (!challenge || challenge.browserHash !== browserHash || challenge.purpose !== purpose ||
    challenge.consumedAt || challenge.expiresAt <= new Date()) throw Errors.INVALID_CODE
  return challenge
}
