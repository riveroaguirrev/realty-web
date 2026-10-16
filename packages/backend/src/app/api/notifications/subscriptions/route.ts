import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authenticatedRoute } from '@/utils/authenticatedRoute'
import { pushConfigured } from '@/services/push.service'
// Only known browser push services. Do not allow arbitrary URLs to turn delivery into SSRF.
const endpointSchema = z.string().url().max(2048).refine(value => {
  const url = new URL(value)
  return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
    (['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com'].includes(url.hostname) || url.hostname.endsWith('.notify.windows.com'))
}, 'Servicio push no admitido.')
const subscriptionSchema = z.object({ endpoint: endpointSchema, keys: z.object({ p256dh: z.string().regex(/^[A-Za-z0-9_-]+={0,2}$/).min(80).max(100), auth: z.string().regex(/^[A-Za-z0-9_-]+={0,2}$/).min(20).max(30) }) })
export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest) {
  return authenticatedRoute(request, async () => NextResponse.json({ success: true, data: { publicKey: pushConfigured() ? process.env.VAPID_PUBLIC_KEY : null } }))
}
export async function POST(request: NextRequest) {
  return authenticatedRoute(request, async advisorId => {
    const data = subscriptionSchema.parse(await request.json())
    await prisma.pushSubscription.upsert({ where: { endpoint: data.endpoint }, create: { advisorId, endpoint: data.endpoint, ...data.keys }, update: { advisorId, ...data.keys } })
    return NextResponse.json({ success: true, data: { subscribed: true } })
  })
}
export async function DELETE(request: NextRequest) {
  return authenticatedRoute(request, async advisorId => {
    const { endpoint } = z.object({ endpoint: endpointSchema }).parse(await request.json())
    await prisma.pushSubscription.deleteMany({ where: { advisorId, endpoint } })
    return NextResponse.json({ success: true, data: { subscribed: false } })
  })
}
