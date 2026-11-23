import { ApiError as AccountApiError } from '@/utils/errors'
import { errorResponse as accountErrorResponse } from '@/lib/auth-route'
import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, sendError } from '@/middleware/auth'
import { Errors } from '@/utils/errors'
import { Permission } from '@shared/types'
import { rateLimit } from '@/services/session.service'
import { requirePermission } from '@/lib/permissions'
import { propertyImageService } from '@/services/propertyImage.service'
import { normalizePropertyImage, readPropertyImageForm } from '@/utils/validatePropertyImage'

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req)
    if (!auth.user) return sendError(auth.error ?? Errors.UNAUTHORIZED, 401)

    requirePermission(auth.user.permissions, Permission.PROPERTY_CREATE)
    await rateLimit(`properties:images:${auth.user.id}`, 100, 600)
    const form = await readPropertyImageForm(req)
    const files = form.getAll('file')
    const file = files[0]
    if (files.length !== 1 || typeof file === 'string' || !file) {
      throw new AccountApiError(400, 'INVALID_IMAGE_FORM', 'Envía una sola imagen por solicitud.')
    }

    const url = await propertyImageService.upload(await normalizePropertyImage(file), auth.user.id)
    return NextResponse.json({ success: true, data: { url } })
  } catch (error) {
    if (error instanceof AccountApiError) return accountErrorResponse(error)
    console.error('Error uploading property image:', error)
    return sendError(Errors.INTERNAL_ERROR, 500)
  }
}
