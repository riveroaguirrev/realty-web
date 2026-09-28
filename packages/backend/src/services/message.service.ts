import { prisma } from '@/lib/prisma'

export class MessageService {
  async sendMessage(conversationId: string, senderId: string, content: string) {
    return await prisma.message.create({
      data: {
        conversationId,
        senderId,
        content,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
      },
    })
  }

  async getMessage(messageId: string) {
    return await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
      },
    })
  }

  async listMessages(conversationId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId },
        skip,
        take: pageSize,
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profileImage: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),
      prisma.message.count({ where: { conversationId } }),
    ])

    return {
      messages,
      total,
      page,
      pageSize,
    }
  }

  async editMessage(messageId: string, content: string) {
    return await prisma.message.update({
      where: { id: messageId },
      data: {
        content,
        editedAt: new Date(),
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
      },
    })
  }

  async deleteMessage(messageId: string) {
    return await prisma.message.delete({
      where: { id: messageId },
    })
  }

  async getLastMessage(conversationId: string) {
    return await prisma.message.findFirst({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })
  }
}

export const messageService = new MessageService()
