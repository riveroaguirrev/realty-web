import { NextRequest, NextResponse } from 'next/server'
import { favoritesService } from '@/services/favorites.service'
import { supabase } from '@/lib/supabase'
import { ApiResponse } from '@shared/types'

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Missing token' } },
        { status: 401 }
      )
    }

    const { data: user, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { propertyId } = body

    if (!propertyId) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'propertyId is required' } },
        { status: 400 }
      )
    }

    const favorite = await favoritesService.addFavorite(user.id, propertyId)

    return NextResponse.json(
      {
        success: true,
        data: favorite,
      },
      { status: 201 }
    )
  } catch (error: any) {
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
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Missing token' } },
        { status: 401 }
      )
    }

    const { data: user, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1
    const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : 10

    const result = await favoritesService.listFavorites(user.id, page, pageSize)

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
