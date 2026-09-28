import { prisma } from '@/lib/prisma'
import { Conversation, ConversationType } from '@shared/types'

export class ConversationService {
  async createConversation(
    createdBy: string,
    participantIds: string[],
    type: ConversationType = 'DIRECT',
    name?: string,
    description?: string
  ) {
    // Ensure creator is in participants
    if (!participantIds.includes(createdBy)) {
      participantIds.push(createdBy)
    }

    return await prisma.conversation.create({
      data: {
        type,
        name,
        description,
        createdBy,
        participants: {
          createMany: {
            data: participantIds.map((advisorId) => ({
              advisorId,
            })),
          },
        },
      },
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
        },
      },
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

    return {
      conversations,
      total,
      page,
      pageSize,
    }
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
