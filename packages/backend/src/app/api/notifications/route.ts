import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticatedRoute } from '@/utils/authenticatedRoute'
import { requirementAccess } from '@/services/requirement.service'
export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest) {
  return authenticatedRoute(request, async advisorId => {
    const items = await prisma.notification.findMany({ where: { advisorId, OR: [{ type: 'REQUIREMENT_CREATED' }, { type: 'SYSTEM', relatedEntityType: 'message' }], isRead: false }, orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, title: true, message: true, actionUrl: true, createdAt: true, relatedEntityId: true, relatedEntityType: true, type: true } })
    const visible = await prisma.requirement.findMany({ where: { id: { in: items.flatMap(item => item.type === 'REQUIREMENT_CREATED' && item.relatedEntityId ? [item.relatedEntityId] : []) }, ...await requirementAccess(prisma, advisorId) }, select: { id: true } })
    const allowed = new Set(visible.map(item => item.id))
    const messages = await prisma.message.findMany({
      where: { id: { in: items.flatMap(item => item.relatedEntityType === 'message' && item.relatedEntityId ? [item.relatedEntityId] : []) }, conversation: { participants: { some: { advisorId } } } },
      select: { id: true, sender: { select: { firstName: true, lastName: true, profileImage: true } } },
    })
    const actors = new Map(messages.map(item => [item.id, item.sender]))
    const allowedMessages = new Set(messages.map(item => item.id))
    return NextResponse.json({ success: true, data: items.filter(item => item.relatedEntityId && (item.type === 'REQUIREMENT_CREATED' ? allowed.has(item.relatedEntityId) : allowedMessages.has(item.relatedEntityId))).map(({ relatedEntityId, relatedEntityType, type, ...item }) => ({ ...item, kind: relatedEntityType === 'message' ? 'message' : 'requirement', actor: relatedEntityType === 'message' && relatedEntityId ? actors.get(relatedEntityId) : undefined })) })
  })
}
