import { prisma } from '@/lib/prisma'
import { Errors } from '@/utils/errors'
import crypto from 'crypto'

export class AdvisorService {
  async sendInvite(orgId: string, email: string) {
    // Check if advisor already exists
    const existing = await prisma.advisor.findUnique({
      where: { email },
    })

    if (existing) {
      if (existing.organizationId === orgId) {
        throw new Error('Advisor already in this organization')
      }
      throw new Error('Email already registered with another organization')
    }

    // Generate invite code
    const code = crypto.randomBytes(16).toString('hex')

    const invite = await prisma.inviteCode.create({
      data: {
        code,
        email,
        organizationId: orgId,
      },
    })

    return {
      inviteCode: invite.code,
      email: invite.email,
      organizationId: invite.organizationId,
      expiresAt: invite.expiresAt,
      inviteLink: `${process.env.NEXT_PUBLIC_APP_URL}/invite?code=${invite.code}`,
    }
  }

  async acceptInvite(code: string, advisorId: string) {
    const invite = await prisma.inviteCode.findUnique({
      where: { code },
    })

    if (!invite) {
      throw new Error('Invalid invite code')
    }

    // Check if code is expired
    if (invite.expiresAt && new Date() > invite.expiresAt) {
      throw new Error('Invite code has expired')
    }

    // Check if already used
    if (invite.usedAt) {
      throw new Error('Invite code has already been used')
    }

    // Update advisor with organization
    const advisor = await prisma.advisor.update({
      where: { id: advisorId },
      data: {
        organizationId: invite.organizationId,
        role: 'AGENT',
      },
      include: { organization: true },
    })

    // Mark invite as used
    await prisma.inviteCode.update({
      where: { code },
      data: { usedAt: new Date() },
    })

    return advisor
  }

  async removeAdvisor(orgId: string, advisorId: string) {
    const advisor = await prisma.advisor.findUnique({
      where: { id: advisorId },
    })

    if (!advisor || advisor.organizationId !== orgId) {
      throw Errors.USER_NOT_FOUND
    }

    // Prevent removing the only DIRECTOR
    const directors = await prisma.advisor.count({
      where: {
        organizationId: orgId,
        role: 'DIRECTOR',
      },
    })

    if (advisor.role === 'DIRECTOR' && directors === 1) {
      throw new Error('Cannot remove the last director from organization')
    }

    // Update advisor - remove from organization
    const updated = await prisma.advisor.update({
      where: { id: advisorId },
      data: {
        organizationId: null,
        role: 'AGENT',
      },
    })

    return updated
  }

  async listInvites(orgId: string) {
    const invites = await prisma.inviteCode.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    })

    return invites
  }
}

export const advisorService = new AdvisorService()
