import { ApiError as AccountApiError } from '@/utils/errors'
import { errorResponse as accountErrorResponse } from '@/lib/auth-route'
import { NextRequest, NextResponse } from 'next/server'
import { propertyService } from '@/services/property.service'
import { verifyAuth, sendError } from '@/middleware/auth'
import { Errors } from '@/utils/errors'
import { readPagination } from '@/utils/pagination'

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req)

    if (!auth.user) {
      const response = sendError(auth.error ?? Errors.UNAUTHORIZED, 401)
      return response
    }

    const url = new URL(req.url)
    const { page, pageSize } = readPagination(url.searchParams, 10)
    const status = url.searchParams.get('status') || undefined

    const result = await propertyService.getAdvisorProperties(auth.user.id, page, pageSize, status)

    const response = NextResponse.json({
      success: true,
      data: result.properties,
      meta: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
      },
    })
    return response
  } catch (error) {
    if (error instanceof AccountApiError) return accountErrorResponse(error)
    console.error('Error fetching advisor properties:', error)
    const response = sendError(Errors.INTERNAL_ERROR, 500)
    return response
  }
}
