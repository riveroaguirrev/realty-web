import { NextRequest, NextResponse } from 'next/server'
import { propertyService } from '@/services/property.service'
import { ApiResponse } from '@shared/types'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const { searchParams } = new URL(request.url)

    const city = searchParams.get('city') || undefined
    const region = searchParams.get('region') || undefined
    const type = searchParams.get('type') || undefined
    const organizationId = searchParams.get('organizationId') || undefined
    const priceMin = searchParams.get('priceMin') ? parseInt(searchParams.get('priceMin')!) : undefined
    const priceMax = searchParams.get('priceMax') ? parseInt(searchParams.get('priceMax')!) : undefined
    const bedroomsMin = searchParams.get('bedroomsMin') ? parseInt(searchParams.get('bedroomsMin')!) : undefined
    const bedroomsMax = searchParams.get('bedroomsMax') ? parseInt(searchParams.get('bedroomsMax')!) : undefined
    const bathroomsMin = searchParams.get('bathroomsMin') ? parseInt(searchParams.get('bathroomsMin')!) : undefined
    const bathroomsMax = searchParams.get('bathroomsMax') ? parseInt(searchParams.get('bathroomsMax')!) : undefined
    const areaMin = searchParams.get('areaMin') ? parseInt(searchParams.get('areaMin')!) : undefined
    const areaMax = searchParams.get('areaMax') ? parseInt(searchParams.get('areaMax')!) : undefined
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1
    const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : 20

    const result = await propertyService.searchProperties({
      city,
      region,
      type,
      organizationId,
      priceMin,
      priceMax,
      bedroomsMin,
      bedroomsMax,
      bathroomsMin,
      bathroomsMax,
      areaMin,
      areaMax,
      page,
      pageSize,
    })

    return NextResponse.json(
      {
        success: true,
        data: result.properties,
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
    console.error('Search properties error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: 'Failed to search properties',
        },
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
