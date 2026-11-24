import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import type { MessageAttachment } from '@shared/messageAttachments'
import { messageAttachmentService, readAttachments } from './messageAttachment.service'

export class MessageService {
  async sendMessage(conversationId: string, senderId: string, content: string, attachments: MessageAttachment[] = []) {
    return await prisma.$transaction(async tx => {
      const message = await tx.message.create({
        data: {
          conversationId,
          senderId,
          content,
          attachments: attachments as unknown as Prisma.InputJsonValue,
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
      await tx.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: message.createdAt } })
      return message
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
          createdAt: 'desc',
        },
      }),
      prisma.message.count({ where: { conversationId } }),
    ])

    return {
      messages: messages.reverse(),
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
    const message = await prisma.message.delete({ where: { id: messageId } })
    await messageAttachmentService.remove(readAttachments(message.attachments))
    return message
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
