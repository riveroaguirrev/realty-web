import { ApiError as AccountApiError } from '@/utils/errors'
import { errorResponse as accountErrorResponse } from '@/lib/auth-route'
import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, sendError } from '@/middleware/auth'
import { Errors } from '@/utils/errors'
import { Permission } from '@shared/types'
import { requirePermission } from '@/lib/permissions'
import { propertyImageService, MAX_IMAGE_BYTES, UploadedImage } from '@/services/propertyImage.service'

const isUploadedImage = (value: unknown): value is UploadedImage =>
  typeof value === 'object' && value !== null && 'arrayBuffer' in value && 'type' in value && 'size' in value

const validationError = (message: string) =>
  NextResponse.json({ success: false, error: { message, code: 'VALIDATION_ERROR' } }, { status: 400 })

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req)
    if (!auth.user) return sendError(auth.error ?? Errors.UNAUTHORIZED, 401)

    requirePermission(auth.user.permissions, Permission.PROPERTY_CREATE)
    const form = await req.formData().catch(() => null)
    if (!form) return validationError('Request must be multipart/form-data')

    const file = form.get('file')
    if (!isUploadedImage(file)) return validationError('An image file is required')
    if (!propertyImageService.isSupportedMimeType(file.type)) {
      return validationError('Only JPEG, PNG or WebP images are allowed')
    }
    if (file.size > MAX_IMAGE_BYTES) return validationError('Image must be 5 MB or smaller')

    const url = await propertyImageService.upload(file, auth.user.id)
    return NextResponse.json({ success: true, data: { url } })
  } catch (error) {
    if (error instanceof AccountApiError) return accountErrorResponse(error)
    console.error('Error uploading property image:', error)
    return sendError(Errors.INTERNAL_ERROR, 500)
  }
}
