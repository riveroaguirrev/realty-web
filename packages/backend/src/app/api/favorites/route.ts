import { readPagination } from '@/utils/pagination'
import { ApiError as AccountApiError } from '@/utils/errors'
import { errorResponse as accountErrorResponse } from '@/lib/auth-route'
import { NextRequest, NextResponse } from 'next/server'
import { favoritesService } from '@/services/favorites.service'
import { requireUser } from '@/middleware/auth'
import { ApiResponse } from '@shared/types'

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const user = await requireUser(request)

    const body = await request.json() as { propertyId?: string }
    const { propertyId } = body

    if (typeof propertyId !== 'string' || !propertyId) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'propertyId is required' } },
        { status: 400 }
      )
    }

    const favorite = await favoritesService.addFavorite(user, propertyId)

    return NextResponse.json(
      {
        success: true,
        data: favorite,
      },
      { status: 201 }
    )
  } catch (error: any) {
    if (error instanceof AccountApiError) return accountErrorResponse(error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: { code: 'ALREADY_FAVORITED', message: 'Already favorited' } },
        { status: 409 }
      )
    }

    console.error('Add favorite error:', error)
    return NextResponse.json(
      {
        success: false,
        error: { code: 'ADD_FAVORITE_ERROR', message: 'Failed to add favorite' },
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const user = await requireUser(request)

    const { searchParams } = new URL(request.url)
    const { page, pageSize } = readPagination(searchParams, 10)

    const result = await favoritesService.listFavorites(user, page, pageSize)

    return NextResponse.json(
      {
        success: true,
        data: result.favorites.map((f) => f.property),
        meta: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / result.pageSize),
        },
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof AccountApiError) return accountErrorResponse(error)
    console.error('Get favorites error:', error)
    return NextResponse.json(
      {
        success: false,
        error: { code: 'GET_FAVORITES_ERROR', message: 'Failed to get favorites' },
      },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
