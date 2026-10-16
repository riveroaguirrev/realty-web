import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticatedRoute } from '@/utils/authenticatedRoute'
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return authenticatedRoute(request, async advisorId => {
    await prisma.notification.updateMany({ where: { id: params.id, advisorId }, data: { isRead: true, readAt: new Date() } })
    return NextResponse.json({ success: true, data: {} })
  })
}
