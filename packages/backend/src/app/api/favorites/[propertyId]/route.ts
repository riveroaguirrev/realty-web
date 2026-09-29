import { NextRequest, NextResponse } from 'next/server'
import { favoritesService } from '@/services/favorites.service'
import { supabase } from '@/lib/supabase'
import { ApiResponse } from '@shared/types'
import { requireUser, sendError } from '@/middleware/auth'
import { ApiError, Errors } from '@/utils/errors'

export async function GET(request: NextRequest, { params }: { params: { propertyId: string } }) {
  try {
    const user = await requireUser(request)
    const isFavorite = await favoritesService.isFavorite(user.id, params.propertyId)
    return NextResponse.json({ success: true, data: { isFavorite } })
  } catch (error) {
    if (error instanceof ApiError) return sendError(error, error.statusCode)
    console.error('Check favorite error:', error)
    return sendError(Errors.INTERNAL_ERROR, 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { propertyId: string } }
): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Missing token' } },
        { status: 401 }
      )
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } },
        { status: 401 }
      )
    }

    const { propertyId } = params

    if (!propertyId) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'propertyId is required' } },
        { status: 400 }
      )
    }

    await favoritesService.removeFavorite(user.id, propertyId)

    return NextResponse.json(
      {
        success: true,
        data: { removed: true },
      },
      { status: 200 }
    )
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Favorite not found' },
        },
        { status: 404 }
      )
    }

    console.error('Remove favorite error:', error)
    return NextResponse.json(
      {
        success: false,
        error: { code: 'REMOVE_FAVORITE_ERROR', message: 'Failed to remove favorite' },
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
      'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
