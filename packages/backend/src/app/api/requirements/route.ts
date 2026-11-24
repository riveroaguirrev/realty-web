import { NextRequest, NextResponse } from 'next/server'
import { authenticatedRoute } from '@/utils/authenticatedRoute'
import { listRequirements, publishRequirement } from '@/services/requirement.service'
import { rateLimit } from '@/services/session.service'
import { deliverPendingPush } from '@/services/push.service'
export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest) {
  return authenticatedRoute(request, async advisorId => {
    const page = Math.max(1, Math.min(10000, Number(request.nextUrl.searchParams.get('page')) || 1))
    const result = await listRequirements(advisorId, request.nextUrl.searchParams.get('mine') === 'true', Math.floor(page), request.nextUrl.searchParams.get('organization') === 'true')
    return NextResponse.json({ success: true, data: result.items, meta: { total: result.total, page: Math.floor(page), pageSize: 20 } })
  })
}
export async function POST(request: NextRequest) {
  return authenticatedRoute(request, async advisorId => {
    const input = await request.json()
    await rateLimit(`requirements:publish:${advisorId}`, 20, 600)
    const requirement = await publishRequirement(advisorId, input)
    // Persistent outbox is retried by the delivery endpoint if the provider is temporarily unavailable.
    if (process.env.PUSH_DELIVERY_SCHEDULED !== 'true') {
      try { await deliverPendingPush(requirement.id) } catch (error) { console.error('Push delivery deferred', error) }
    }
    return NextResponse.json({ success: true, data: requirement }, { status: 201 })
  })
}
