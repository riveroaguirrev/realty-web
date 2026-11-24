import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticatedRoute } from '@/utils/authenticatedRoute'
import { requirementAccess } from '@/services/requirement.service'
export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest) {
  return authenticatedRoute(request, async advisorId => {
    const items = await prisma.notification.findMany({ where: { advisorId, type: 'REQUIREMENT_CREATED', isRead: false }, orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, title: true, message: true, actionUrl: true, createdAt: true, relatedEntityId: true } })
    const visible = await prisma.requirement.findMany({ where: { id: { in: items.flatMap(item => item.relatedEntityId ? [item.relatedEntityId] : []) }, ...await requirementAccess(prisma, advisorId) }, select: { id: true } })
    const allowed = new Set(visible.map(item => item.id))
    return NextResponse.json({ success: true, data: items.filter(item => item.relatedEntityId && allowed.has(item.relatedEntityId)).map(({ relatedEntityId, ...item }) => item) })
  })
}
