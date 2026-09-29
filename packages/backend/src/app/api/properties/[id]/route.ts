import { NextRequest, NextResponse } from 'next/server'
import { propertyService } from '@/services/property.service'
import { propertyImageService } from '@/services/propertyImage.service'
import { requireUser, sendError, verifyAuth } from '@/middleware/auth'
import { ApiError, Errors } from '@/utils/errors'
import { requirePropertyManagement } from '@/lib/permissions'
import { validatePropertyInput } from '@/utils/validators'

const PROPERTY_NOT_FOUND = new ApiError(404, 'PROPERTY_NOT_FOUND', 'Property not found')
const PROPERTY_IN_USE = new ApiError(
  409,
  'PROPERTY_IN_USE',
  'This property has related records and cannot be deleted. Archive it instead.'
)
const FOREIGN_KEY_VIOLATION = 'P2003'

type RouteContext = { params: { id: string } }

const handleError = (error: unknown, action: string) => {
  if (error instanceof ApiError) return sendError(error, error.statusCode)
  console.error(`Error ${action} property:`, error)
  return sendError(Errors.INTERNAL_ERROR, 500)
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const auth = await verifyAuth(req)
    if (!auth.user) return sendError(Errors.UNAUTHORIZED, 401)

    const property = await propertyService.getProperty(params.id)
    if (!property) return sendError(PROPERTY_NOT_FOUND, 404)

    return NextResponse.json({ success: true, data: property })
  } catch (error) {
    return handleError(error, 'fetching')
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser(req)

    const existing = await propertyService.getProperty(params.id)
    if (!existing) return sendError(PROPERTY_NOT_FOUND, 404)
    requirePropertyManagement(user, existing)

    const validation = validatePropertyInput(await req.json())
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: { message: validation.errors.join(', '), code: 'VALIDATION_ERROR' } },
        { status: 400 }
      )
    }

    const updated = await propertyService.updateProperty(params.id, validation.data)

    const removedImages = existing.images.filter((url) => !validation.data.images.includes(url))
    await propertyImageService.deleteByUrls(removedImages)

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    return handleError(error, 'updating')
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser(req)

    const existing = await propertyService.getProperty(params.id)
    if (!existing) return sendError(PROPERTY_NOT_FOUND, 404)
    requirePropertyManagement(user, existing)

    try {
      await propertyService.deleteProperty(params.id)
    } catch (error: any) {
      if (error?.code === FOREIGN_KEY_VIOLATION) return sendError(PROPERTY_IN_USE, 409)
      throw error
    }
    await propertyImageService.deleteByUrls(existing.images)

    return NextResponse.json({ success: true, data: { deleted: true } })
  } catch (error) {
    return handleError(error, 'deleting')
  }
}
