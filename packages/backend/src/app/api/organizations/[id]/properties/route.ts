import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse } from '@shared/types'
import { verifyAuth } from '@/middleware/auth'
import { organizationService } from '@/services/organization.service'
import { requireOrgAccess } from '@/lib/permissions'
import { Errors } from '@/utils/errors'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const user = await verifyAuth(request)
    const { id: orgId } = params

    // Check if user is member of this organization
    requireOrgAccess(user.organizationId, orgId)

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20')

    const result = await organizationService.getOrganizationProperties(orgId, page, pageSize)

    return NextResponse.json(
      {
        success: true,
        data: result.properties,
        meta: result.pagination,
      },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    )
  } catch (error) {
    console.error('Get org properties error:', error)

    if (error instanceof Error && error.message === 'Permission denied') {
      return NextResponse.json(
        {
          success: false,
          error: { message: Errors.FORBIDDEN.message, code: Errors.FORBIDDEN.code },
        },
        { status: 403 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: { message: Errors.INTERNAL_ERROR.message, code: Errors.INTERNAL_ERROR.code },
      },
      { status: 500 }
    )
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  )
}
