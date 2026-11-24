import type { Prisma } from '@prisma/client'
import { Errors } from '@/utils/errors'

export const availableSeats = (limit: number, occupied: number, reserved: number) => Math.max(0, limit - occupied - reserved)

export async function lockOrganizationSeats(tx: Prisma.TransactionClient, organizationId: string) {
  // Take the same lock before changing membership, reservations, or the seat limit.
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Organization" WHERE id = ${organizationId} FOR NO KEY UPDATE`
  if (!rows.length) throw Errors.USER_NOT_FOUND
}

export async function seatUsage(tx: Prisma.TransactionClient, organizationId: string) {
  const org = await tx.organization.findUnique({ where: { id: organizationId } })
  if (!org) throw Errors.USER_NOT_FOUND
  const occupied = await tx.advisor.count({ where: { organizationId } })
  const reserved = await tx.inviteCode.count({
    where: { organizationId, usedAt: null, cancelledAt: null, expiresAt: { gt: new Date() } },
  })
  return { limit: org.maxAdvisors, occupied, reserved, available: availableSeats(org.maxAdvisors, occupied, reserved) }
}
