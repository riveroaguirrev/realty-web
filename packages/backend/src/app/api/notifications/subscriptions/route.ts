import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { serializable } from '@/lib/transactions'
import { ApiError } from '@/utils/errors'
import { prisma } from '@/lib/prisma'
import { authenticatedRoute } from '@/utils/authenticatedRoute'
import { pushConfigured } from '@/services/push.service'
// Only known browser push services. Do not allow arbitrary URLs to turn delivery into SSRF.
const endpointSchema = z.string().url().max(2048).refine(value => {
  if (!URL.canParse(value)) return false
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
    const conflict = new ApiError(409, 'PUSH_SUBSCRIPTION_CONFLICT', 'Este navegador necesita renovar su suscripción de avisos.')
    try {
      await serializable(async tx => {
        const existing = await tx.pushSubscription.findUnique({ where: { endpoint: data.endpoint } })
        if (existing) {
          if (existing.advisorId !== advisorId) throw conflict
          await tx.pushSubscription.update({ where: { id: existing.id }, data: data.keys })
          return
        }
        const count = await tx.pushSubscription.count({ where: { advisorId } })
        if (count >= 20) throw new ApiError(429, 'PUSH_SUBSCRIPTION_LIMIT', 'Desactiva los avisos en otro dispositivo antes de conectar uno nuevo.')
        await tx.pushSubscription.create({ data: { advisorId, endpoint: data.endpoint, ...data.keys } })
      })
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error
      const result = await prisma.pushSubscription.updateMany({ where: { endpoint: data.endpoint, advisorId }, data: data.keys })
      if (!result.count) throw conflict
    }
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
