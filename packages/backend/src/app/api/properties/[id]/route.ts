import { NextRequest, NextResponse } from 'next/server'
import { propertyService } from '@/services/property.service'
import { verifyAuth, sendError } from '@/middleware/auth'
import { ApiError, Errors } from '@/utils/errors'

const PROPERTY_NOT_FOUND = new ApiError(404, 'PROPERTY_NOT_FOUND', 'Property not found')

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await verifyAuth(req)
    if (!auth.user) return sendError(Errors.UNAUTHORIZED, 401)

    const property = await propertyService.getProperty(params.id)
    if (!property) return sendError(PROPERTY_NOT_FOUND, 404)

    return NextResponse.json({ success: true, data: property })
  } catch (error) {
    console.error('Error fetching property:', error)
    return sendError(Errors.INTERNAL_ERROR, 500)
  }
}
