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
    const auth = await verifyAuth(req)

    if (!auth.user) {
      const response = sendError(Errors.UNAUTHORIZED, 401)
      return addCORSHeaders(response, req)
    }

    const url = new URL(req.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10')

    const result = await propertyService.getAdvisorProperties(auth.user.id, page, pageSize)

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
    console.error('Error fetching advisor properties:', error)
    const response = sendError(Errors.INTERNAL_ERROR, 500)
    return addCORSHeaders(response, req)
  }
}
