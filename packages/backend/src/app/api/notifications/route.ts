import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticatedRoute } from '@/utils/authenticatedRoute'
export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest) {
  return authenticatedRoute(request, async advisorId => {
    const items = await prisma.notification.findMany({ where: { advisorId, type: 'REQUIREMENT_CREATED', isRead: false }, orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, title: true, message: true, actionUrl: true, createdAt: true } })
    return NextResponse.json({ success: true, data: items })
  })
}
