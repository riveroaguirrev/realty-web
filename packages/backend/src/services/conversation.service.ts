import { ConversationType, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const CONVERSATION_INCLUDE = {
  participants: {
    include: {
      advisor: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profileImage: true,
          organization: { select: { id: true, name: true } },
        },
      },
    },
  },
  messages: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    include: { sender: { select: { id: true, firstName: true, lastName: true } } },
  },
}

export class ConversationService {
  async createConversation(
    createdBy: string,
    participantIds: string[],
    type: ConversationType = 'DIRECT',
    name?: string,
    description?: string
  ) {
    const uniqueParticipantIds = Array.from(new Set([...participantIds, createdBy]))

    if (type === 'DIRECT' && uniqueParticipantIds.length === 2) {
      const existing = await this.findDirectConversation(uniqueParticipantIds[0], uniqueParticipantIds[1])
      if (existing) return existing
    }

    return await prisma.conversation.create({
      data: {
        type,
        name,
        description,
        createdBy,
        participants: {
          createMany: {
            data: uniqueParticipantIds.map((advisorId) => ({
              advisorId,
            })),
          },
        },
      },
      include: CONVERSATION_INCLUDE,
    })
  }

  private async findDirectConversation(advisorIdA: string, advisorIdB: string) {
    return await prisma.conversation.findFirst({
      where: {
        type: 'DIRECT',
        AND: [
          { participants: { some: { advisorId: advisorIdA } } },
          { participants: { some: { advisorId: advisorIdB } } },
        ],
      },
      include: CONVERSATION_INCLUDE,
    })
  }

  async getConversation(conversationId: string) {
    return await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          include: {
            advisor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                profileImage: true,
                organization: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    })
  }

  async listConversations(advisorId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where: {
          participants: {
            some: {
              advisorId,
            },
          },
        },
        skip,
        take: pageSize,
        include: {
          participants: {
            include: {
              advisor: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  profileImage: true,
                  organization: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { sender: { select: { id: true, firstName: true, lastName: true } } },
          },
        },
        orderBy: {
          lastMessageAt: 'desc',
        },
      }),
      prisma.conversation.count({
        where: {
          participants: {
            some: {
              advisorId,
            },
          },
        },
      }),
    ])

    const unreadByConversation = await this.countUnreadByConversation(
      advisorId,
      conversations.map((conversation) => conversation.id)
    )

    return {
      conversations: conversations.map((conversation) => ({
        ...conversation,
        unreadCount: unreadByConversation.get(conversation.id) ?? 0,
      })),
      total,
      page,
      pageSize,
    }
  }

  async countUnreadTotal(advisorId: string): Promise<number> {
    const unreadByConversation = await this.countUnreadByConversation(advisorId)
    return Array.from(unreadByConversation.values()).reduce((sum, count) => sum + count, 0)
  }

  // Unread = messages from other advisors sent after the advisor's lastReadAt.
  private async countUnreadByConversation(
    advisorId: string,
    conversationIds?: string[]
  ): Promise<Map<string, number>> {
    if (conversationIds && conversationIds.length === 0) return new Map()

    const conversationFilter = conversationIds
      ? Prisma.sql`AND m."conversationId" IN (${Prisma.join(conversationIds)})`
      : Prisma.empty

    const rows = await prisma.$queryRaw<{ conversationId: string; unread: number }[]>`
      SELECT m."conversationId" AS "conversationId", COUNT(*)::int AS unread
      FROM "Message" m
      JOIN "ConversationParticipant" p
        ON p."conversationId" = m."conversationId" AND p."advisorId" = ${advisorId}
      WHERE m."senderId" <> ${advisorId}
        AND m."createdAt" > p."lastReadAt"
        ${conversationFilter}
      GROUP BY m."conversationId"
    `

    return new Map(rows.map((row) => [row.conversationId, row.unread]))
  }

  async markAsRead(conversationId: string, advisorId: string) {
    return await prisma.conversationParticipant.update({
      where: {
        conversationId_advisorId: {
          conversationId,
          advisorId,
        },
      },
      data: {
        lastReadAt: new Date(),
      },
    })
  }

  async addParticipant(conversationId: string, advisorId: string) {
    return await prisma.conversationParticipant.create({
      data: {
        conversationId,
        advisorId,
      },
      include: {
        advisor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true,
          },
        },
      },
    })
  }

  async removeParticipant(conversationId: string, advisorId: string) {
    return await prisma.conversationParticipant.delete({
      where: {
        conversationId_advisorId: {
          conversationId,
          advisorId,
        },
      },
    })
  }

  async updateLastMessageTime(conversationId: string) {
    return await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
      },
    })
  }
}

export const conversationService = new ConversationService()
