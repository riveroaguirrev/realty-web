import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { deliverPendingPush } from '@/services/push.service'
export async function POST(request: NextRequest) {
  const expected = process.env.PUSH_DELIVERY_SECRET
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '') || ''
  if (!expected || Buffer.byteLength(token) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(token), Buffer.from(expected))) return NextResponse.json({ success: false }, { status: 401 })
  return NextResponse.json({ success: true, data: await deliverPendingPush() })
}
