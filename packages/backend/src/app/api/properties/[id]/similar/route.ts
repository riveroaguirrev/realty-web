import { errorResponse as accountErrorResponse } from '@/lib/auth-route'
import { NextRequest, NextResponse } from 'next/server'
import { MatchingService, PropertyMatch } from '@/services/matching.service'
import { ApiResponse } from '@shared/types'
import { requireUser, sendError } from '@/middleware/auth'
import { rateLimit } from '@/services/session.service'
import { visiblePropertyWhere } from '@/lib/permissions'
import { ApiError, Errors } from '@/utils/errors'

const parseLimit = (value: string | null): number => {
  const parsed = Number(value ?? 6)
  if (!Number.isInteger(parsed) || parsed < 1) return 6
  return Math.min(parsed, 20)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<PropertyMatch[]>>> {
  try {
    const user = await requireUser(request)
    await rateLimit(`properties:similar:${user.id}`, 120, 60)
    const { searchParams } = new URL(request.url)
    const limit = parseLimit(searchParams.get('limit'))

    const matches = await MatchingService.getSimilarPropertiesWithDetails(
      (await params).id,
      visiblePropertyWhere(user),
      limit
    )

    if (!matches) return sendError(new ApiError(404, 'PROPERTY_NOT_FOUND', 'Property not found'), 404)

    const response: ApiResponse<PropertyMatch[]> = {
      success: true,
      data: matches,
      meta: {
        total: matches.length,
      },
    }

    return NextResponse.json(response, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    if (error instanceof ApiError) return accountErrorResponse(error)
    console.error('Error fetching similar properties:', error)
    return sendError(Errors.INTERNAL_ERROR, 500)
  }
}
