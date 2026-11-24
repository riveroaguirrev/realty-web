import { randomBytes } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { ApiError, Errors } from '@/utils/errors'
import { emailSchema } from '@shared/validation/auth'
import { lockOrganizationSeats, seatUsage } from './seats.service'

const alreadyMember = () => new ApiError(409, 'ALREADY_MEMBER', 'Tu cuenta ya pertenece a una sucursal.')

export class AdvisorService {
  async sendInvite(orgId: string, input: string) {
    const email = emailSchema.parse(input)
    const invite = await prisma.$transaction(async (tx) => {
      await lockOrganizationSeats(tx, orgId)
      const org = await tx.organization.findUniqueOrThrow({ where: { id: orgId } })
      if (org.status !== 'ACTIVE') throw Errors.FORBIDDEN
      const existing = await tx.advisor.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } })
      if (existing?.organizationId || existing?.userRole === 'BUYER') {
        throw new ApiError(409, 'ALREADY_MEMBER', 'Esta cuenta ya pertenece a una sucursal o es una cuenta de comprador.')
      }
      const pending = await tx.inviteCode.findFirst({
        where: { organizationId: orgId, email, usedAt: null, cancelledAt: null, expiresAt: { gt: new Date() } },
      })
      if (pending) return pending
      if ((await seatUsage(tx, orgId)).available === 0) throw Errors.SEAT_LIMIT_REACHED
      return tx.inviteCode.create({ data: { code: randomBytes(24).toString('hex'), email, organizationId: orgId } })
    }, { isolationLevel: 'ReadCommitted' })
    return {
      id: invite.id, inviteCode: invite.code, email: invite.email, organizationId: orgId,
      expiresAt: invite.expiresAt, inviteLink: (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:5173') + '/invite?code=' + invite.code,
    }
  }
  async acceptInvite(code: string, advisorId: string) {
    return prisma.$transaction(async (tx) => {
      const target = await tx.inviteCode.findUnique({ where: { code }, select: { organizationId: true } })
      if (!target) throw Errors.INVALID_CODE
      await lockOrganizationSeats(tx, target.organizationId)
      const invite = await tx.inviteCode.findUnique({ where: { code } })
      if (!invite || invite.cancelledAt || invite.expiresAt <= new Date()) throw Errors.INVALID_CODE
      const advisor = await tx.advisor.findUniqueOrThrow({ where: { id: advisorId } })
      if (advisor.userRole !== 'ADVISOR' || advisor.email.toLowerCase() !== invite.email.toLowerCase()) {
        throw new ApiError(403, 'INVITE_EMAIL_MISMATCH', 'Inicia sesión con el correo de asesor al que se dirigió la invitación.')
      }
      // A retry by its original recipient returns the committed result.
      if (invite.usedAt) {
        if (invite.usedById === advisorId && advisor.organizationId === invite.organizationId) {
          return tx.advisor.findUniqueOrThrow({ where: { id: advisorId }, include: { organization: true } })
        }
        throw Errors.INVALID_CODE
      }
      if (advisor.organizationId) throw alreadyMember()
      const org = await tx.organization.findUniqueOrThrow({ where: { id: invite.organizationId } })
      if (org.status !== 'ACTIVE') throw Errors.FORBIDDEN
      const seats = await seatUsage(tx, invite.organizationId)
      if (seats.occupied + seats.reserved > seats.limit) throw Errors.SEAT_LIMIT_REACHED
      const claimed = await tx.inviteCode.updateMany({
        where: { id: invite.id, usedAt: null, cancelledAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date(), usedById: advisorId },
      })
      if (claimed.count !== 1) throw Errors.INVALID_CODE
      const joined = await tx.advisor.updateMany({
        where: { id: advisorId, organizationId: null, email: advisor.email },
        data: { organizationId: invite.organizationId, role: 'AGENT' },
      })
      if (joined.count !== 1) {
        const current = await tx.advisor.findUnique({ where: { id: advisorId } })
        if (current?.organizationId) throw alreadyMember()
        throw Errors.INVALID_CODE
      }
      return tx.advisor.findUniqueOrThrow({ where: { id: advisorId }, include: { organization: true } })
    }, { isolationLevel: 'ReadCommitted' })
  }
  async cancelInvite(orgId: string, inviteId: string) {
    return prisma.$transaction(async (tx) => {
      await lockOrganizationSeats(tx, orgId)
      const invite = await tx.inviteCode.findUnique({ where: { id: inviteId } })
      if (!invite || invite.organizationId !== orgId) throw Errors.USER_NOT_FOUND
      if (invite.usedAt) throw new ApiError(409, 'INVITE_USED', 'La invitación ya fue aceptada.')
      return tx.inviteCode.update({ where: { id: inviteId }, data: { cancelledAt: new Date() } })
    }, { isolationLevel: 'ReadCommitted' })
  }
  async removeAdvisor(orgId: string, advisorId: string) {
    return prisma.$transaction(async (tx) => {
      await lockOrganizationSeats(tx, orgId)
      const advisor = await tx.advisor.findUnique({ where: { id: advisorId } })
      if (!advisor || advisor.organizationId !== orgId) throw Errors.USER_NOT_FOUND
      if (advisor.role === 'DIRECTOR' && await tx.advisor.count({ where: { organizationId: orgId, role: 'DIRECTOR' } }) <= 1) {
        throw new ApiError(409, 'LAST_DIRECTOR', 'No puedes retirar al último administrador.')
      }
      return tx.advisor.update({ where: { id: advisorId }, data: { organizationId: null, role: 'AGENT' } })
    }, { isolationLevel: 'ReadCommitted' })
  }
  listInvites(orgId: string) {
    return prisma.inviteCode.findMany({
      where: { organizationId: orgId, usedAt: null, cancelledAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' },
    })
  }
}
export const advisorService = new AdvisorService()
