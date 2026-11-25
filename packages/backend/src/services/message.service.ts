import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import type { MessageAttachment } from '@shared/messageAttachments'
import { messageAttachmentService, readAttachments } from './messageAttachment.service'
import { ApiError } from '@/utils/errors'

const sender = { select: { id: true, firstName: true, lastName: true, profileImage: true } }
const historySender = { select: { ...sender.select, email: true } }

function readCursor(cursor: string) {
  const [date, id, extra] = cursor.split('|')
  const createdAt = new Date(date)
  if (!id || id.length > 128 || extra !== undefined || !Number.isFinite(createdAt.getTime()) || createdAt.toISOString() !== date) {
    throw new ApiError(400, 'INVALID_MESSAGE_CURSOR', 'El marcador del historial de mensajes no es válido.')
  }
  return { createdAt, id }
}

export class MessageService {
  async sendMessage(conversationId: string, senderId: string, content: string, attachments: MessageAttachment[] = []) {
    return prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: { conversationId, senderId, content, attachments: attachments as unknown as Prisma.InputJsonValue },
        include: { sender },
      })
      await tx.conversation.updateMany({
        where: { id: conversationId, OR: [{ lastMessageAt: null }, { lastMessageAt: { lt: message.createdAt } }] },
        data: { lastMessageAt: message.createdAt },
      })
      const recipients = await tx.conversationParticipant.findMany({
        where: { conversationId, advisorId: { not: senderId }, advisor: { status: 'ACTIVE' } }, select: { advisorId: true },
      })
      const name = `${message.sender.firstName} ${message.sender.lastName}`.trim()
      if (recipients.length) await tx.notification.createMany({ data: recipients.map(recipient => ({
        advisorId: recipient.advisorId, type: 'SYSTEM', channel: 'PUSH', title: `Mensaje de ${name}`,
        message: content.slice(0, 100) || 'Archivo adjunto', relatedEntityType: 'message', relatedEntityId: message.id,
        actionUrl: `/messages/${conversationId}`, actionLabel: 'Abrir conversación',
        data: { conversationId }, createdAt: message.createdAt, scheduledFor: new Date(),
      })) })
      return message
    })
  }

  async getMessage(messageId: string) {
    return prisma.message.findUnique({ where: { id: messageId }, include: { sender } })
  }

  async requireMessageSender(conversationId: string, messageId: string, advisorId: string) {
    const message = await prisma.message.findUnique({
      where: { id: messageId, conversationId }, select: { senderId: true },
    })
    if (!message) throw new ApiError(404, 'NOT_FOUND', 'No encontramos el mensaje.')
    if (message.senderId !== advisorId) throw new ApiError(403, 'FORBIDDEN', 'Solo el autor puede modificar el mensaje.')
  }

  async listRecentMessages(conversationId: string, pageSize: number, cursor: string | null) {
    const before = cursor === null ? undefined : readCursor(cursor)
    const records = await prisma.message.findMany({
      where: {
        conversationId,
        OR: before && [{ createdAt: { lt: before.createdAt } }, { createdAt: before.createdAt, id: { lt: before.id } }],
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: pageSize + 1,
      include: { sender: historySender },
    })
    const messages = records.slice(0, pageSize)
    const oldest = messages.at(-1)
    return {
      messages,
      nextCursor: records.length > pageSize && oldest ? `${oldest.createdAt.toISOString()}|${oldest.id}` : null,
    }
  }

  async listMessages(conversationId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId },
        skip,
        take: pageSize,
        include: { sender: historySender },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
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
      include: { sender },
    })
  }

  async deleteMessage(messageId: string) {
    const message = await prisma.message.delete({ where: { id: messageId } })
    await prisma.notification.deleteMany({ where: { relatedEntityType: 'message', relatedEntityId: messageId } })
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
