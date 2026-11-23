import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { propertyImageService } from '@/services/propertyImage.service'

export async function POST(request: NextRequest) {
  const secret = process.env.PROPERTY_IMAGE_CLEANUP_SECRET
  const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1] ?? ''
  if (!secret || Buffer.byteLength(token) !== Buffer.byteLength(secret) ||
    !timingSafeEqual(Buffer.from(token), Buffer.from(secret))) {
    return NextResponse.json({ success: false }, { status: 401 })
  }
  const removed = await propertyImageService.cleanupRemovedImages()
  return NextResponse.json({ success: true, data: { removed } })
}
