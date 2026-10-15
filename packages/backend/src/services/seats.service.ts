import type { Prisma } from '@prisma/client'
import { Errors } from '@/utils/errors'

export const availableSeats = (limit: number, occupied: number, reserved: number) => Math.max(0, limit - occupied - reserved)
export async function seatUsage(tx: Prisma.TransactionClient, organizationId: string) {
  const org = await tx.organization.findUnique({ where: { id: organizationId } })
  if (!org) throw Errors.USER_NOT_FOUND
  const occupied = await tx.advisor.count({ where: { organizationId } })
  const reserved = await tx.inviteCode.count({
    where: { organizationId, usedAt: null, cancelledAt: null, expiresAt: { gt: new Date() } },
  })
  return { limit: org.maxAdvisors, occupied, reserved, available: availableSeats(org.maxAdvisors, occupied, reserved) }
}
