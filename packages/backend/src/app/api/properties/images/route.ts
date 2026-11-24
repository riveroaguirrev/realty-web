import { ApiError as AccountApiError } from '@/utils/errors'
import { errorResponse as accountErrorResponse } from '@/lib/auth-route'
import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, sendError } from '@/middleware/auth'
import { Errors } from '@/utils/errors'
import { Permission } from '@shared/types'
import { rateLimit } from '@/services/session.service'
import { requirePermission } from '@/lib/permissions'
import { propertyImageService } from '@/services/propertyImage.service'
import { readImageUpload } from '@/utils/validateImage'

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req)
    if (!auth.user) return sendError(auth.error ?? Errors.UNAUTHORIZED, 401)

    requirePermission(auth.user.permissions, Permission.PROPERTY_CREATE)
    await rateLimit(`properties:images:${auth.user.id}`, 100, 600)
    const url = await propertyImageService.upload(await readImageUpload(req), auth.user.id)
    return NextResponse.json({ success: true, data: { url } })
  } catch (error) {
    if (error instanceof AccountApiError) return accountErrorResponse(error)
    console.error('Error uploading property image:', error)
    return sendError(Errors.INTERNAL_ERROR, 500)
  }
}
