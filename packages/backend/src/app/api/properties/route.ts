import { NextRequest, NextResponse } from 'next/server'
import { propertyService } from '@/services/property.service'
import { verifyAuth, sendError } from '@/middleware/auth'
import { Errors } from '@/utils/errors'
import { handleCORS, addCORSHeaders } from '@/middleware/cors'

export async function OPTIONS(req: NextRequest) {
  return handleCORS(req)
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10')
    const city = url.searchParams.get('city') || undefined
    const region = url.searchParams.get('region') || undefined
    const type = url.searchParams.get('type') || undefined
    const priceMin = url.searchParams.get('priceMin') ? parseInt(url.searchParams.get('priceMin')!) : undefined
    const priceMax = url.searchParams.get('priceMax') ? parseInt(url.searchParams.get('priceMax')!) : undefined

    const result = await propertyService.listProperties({
      city,
      region,
      type,
      priceMin,
      priceMax,
      page,
      pageSize,
    })

    const response = NextResponse.json({
      success: true,
      data: result.properties,
      meta: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
      },
    })
    return addCORSHeaders(response, req)
  } catch (error) {
    console.error('Error fetching properties:', error)
    const response = sendError(Errors.INTERNAL_ERROR, 500)
    return addCORSHeaders(response, req)
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req)

    if (!auth.user) {
      const response = sendError(Errors.UNAUTHORIZED, 401)
      return addCORSHeaders(response, req)
    }

    const body = await req.json()

    const property = await propertyService.createProperty({
      ...body,
      advisorId: auth.user.id,
    })

    const response = NextResponse.json({
      success: true,
      data: property,
    })
    return addCORSHeaders(response, req)
  } catch (error) {
    console.error('Error creating property:', error)
    const response = sendError(error || Errors.INTERNAL_ERROR, 400)
    return addCORSHeaders(response, req)
  }
}
