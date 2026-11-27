import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/middleware/auth'
import { errorResponse } from '@/lib/auth-route'
import { propertyService } from '@/services/property.service'
import { ApiError } from '@/utils/errors'
import { isPropertyStatus } from '@shared/propertyStatus'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request)
    const body: unknown = await request.json()
    const status = body && typeof body === 'object' && 'status' in body ? body.status : undefined
    if (!isPropertyStatus(status)) throw new ApiError(400, 'INVALID_PROPERTY_STATUS', 'Selecciona un estado válido: Disponible, En pausa, Reservada o Cerrada.')
    const property = await propertyService.updatePropertyStatus((await params).id, status, user)
    return NextResponse.json({ success: true, data: property }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return errorResponse(error)
  }
}
