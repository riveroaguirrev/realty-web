import { NextRequest, NextResponse } from 'next/server'
import { errorResponse } from '@/lib/auth-route'
import { requireUser } from '@/middleware/auth'
import { authService } from '@/services/auth.service'
import { rateLimit } from '@/services/session.service'
import { readImageUpload } from '@/utils/validateImage'

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request)
    await rateLimit(`profile:photo:${user.id}`, 12, 600)
    const image = await readImageUpload(request, 768)
    const profile = await authService.updateProfileImage(user.id, image)
    return NextResponse.json({ success: true, data: profile }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return errorResponse(error)
  }
}
