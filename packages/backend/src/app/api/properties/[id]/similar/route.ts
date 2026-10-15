import { ApiError as AccountApiError } from '@/utils/errors'
import { errorResponse as accountErrorResponse } from '@/lib/auth-route'
import { NextRequest, NextResponse } from 'next/server'
import { MatchingService, PropertyMatch } from '@/services/matching.service'
import { ApiResponse } from '@shared/types'

const parseLimit = (value: string | null): number => {
  const parsed = Number(value ?? 6)
  if (!Number.isInteger(parsed) || parsed < 1) return 6
  return Math.min(parsed, 20)
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<PropertyMatch[]>>> {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseLimit(searchParams.get('limit'))

    const matches = await MatchingService.getSimilarPropertiesWithDetails(
      params.id,
      limit
    )

    const response: ApiResponse<PropertyMatch[]> = {
      success: true,
      data: matches,
      meta: {
        total: matches.length,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    if (error instanceof AccountApiError) return accountErrorResponse(error)
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to find similar properties',
          code: 'SIMILAR_PROPERTIES_ERROR',
        },
      } as ApiResponse<PropertyMatch[]>,
      { status: 500 }
    )
  }
}
