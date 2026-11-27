import { publicPropertyLocation } from '@/utils/propertyLocation'
import { propertyDiscoveryView } from '@/utils/propertyView'
import { canManageProperty } from '@/lib/permissions'
import { NextRequest, NextResponse } from 'next/server'
import { propertyService } from '@/services/property.service'
import { requireUser, sendError, verifyAuth } from '@/middleware/auth'
import { ApiError, Errors } from '@/utils/errors'
import { validatePropertyInput } from '@/utils/validators'
import { whatsappPhoneFor } from '@/utils/whatsappContact'

const PROPERTY_NOT_FOUND = new ApiError(404, 'PROPERTY_NOT_FOUND', 'Property not found')
const PROPERTY_IN_USE = new ApiError(
  409,
  'PROPERTY_IN_USE',
  'Esta propiedad tiene registros relacionados y no puede eliminarse. Puedes ponerla en pausa.'
)
const FOREIGN_KEY_VIOLATION = 'P2003'

type RouteContext = { params: Promise<{ id: string }> }

const handleError = (error: unknown, action: string) => {
  if (error instanceof ApiError) return sendError(error, error.statusCode)
  console.error(`Error ${action} property:`, error)
  return sendError(Errors.INTERNAL_ERROR, 500)
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const auth = await verifyAuth(req)
    if (!auth.user) return sendError(auth.error ?? Errors.UNAUTHORIZED, 401)

    const { id } = await params
    const property = await propertyService.getProperty(id)
    if (!property) return sendError(PROPERTY_NOT_FOUND, 404)

    const canManage = canManageProperty(auth.user, property)
    if (!canManage && property.visibility === 'ORGANIZATION' && (!auth.user.organizationId || property.organizationId !== auth.user.organizationId)) return sendError(PROPERTY_NOT_FOUND, 404)
    if (!canManage && property.status !== 'AVAILABLE') return sendError(PROPERTY_NOT_FOUND, 404)

    const { status, userRole, ...advisor } = property.advisor
    const detail = {
      ...property,
      advisor: { ...advisor, whatsappPhone: whatsappPhoneFor({ ...advisor, status, userRole }, auth.user.id) },
    }
    return NextResponse.json({ success: true, data: canManage ? detail : publicPropertyLocation(propertyDiscoveryView(detail)) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return handleError(error, 'fetching')
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser(req)

    const validation = validatePropertyInput(await req.json())
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: { message: validation.errors.join(', '), code: 'VALIDATION_ERROR' } },
        { status: 400 }
      )
    }

    const { id } = await params
    const updated = await propertyService.updateProperty(id, validation.data, user)

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    return handleError(error, 'updating')
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser(req)

    const { id } = await params
    try {
      await propertyService.deleteProperty(id, user)
    } catch (error: any) {
      if (error?.code === FOREIGN_KEY_VIOLATION) return sendError(PROPERTY_IN_USE, 409)
      throw error
    }
    return NextResponse.json({ success: true, data: { deleted: true } })
  } catch (error) {
    return handleError(error, 'deleting')
  }
}
