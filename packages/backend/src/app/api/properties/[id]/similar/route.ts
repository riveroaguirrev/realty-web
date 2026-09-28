import { NextRequest, NextResponse } from 'next/server'
import { MatchingService } from '@/services/matching.service'
import { ApiResponse } from '@shared/types'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '6')

    const matches = await MatchingService.getSimilarPropertiesWithDetails(
      params.id,
      Math.min(limit, 20)
    )

    const response: ApiResponse = {
      success: true,
      data: matches,
      meta: {
        count: matches.length,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to find similar properties',
      } as ApiResponse,
      { status: 500 }
    )
  }
}
