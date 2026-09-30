import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse, Permission } from '@shared/types'
import { requireUser } from '@/middleware/auth'
import { organizationService } from '@/services/organization.service'
import { requireOrgAccess } from '@/lib/permissions'
import { Errors } from '@/utils/errors'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const user = await requireUser(request)
    const { id: orgId } = params

    // Check if user is member of this organization
    requireOrgAccess(user.organizationId, orgId)

    const organization = await organizationService.getOrganization(orgId)

    return NextResponse.json(
      {
        success: true,
        data: organization,
      },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    )
  } catch (error) {
    console.error('Organization fetch error:', error)

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
        error: { message: Errors.USER_NOT_FOUND.message, code: Errors.USER_NOT_FOUND.code },
      },
      { status: 404 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const user = await requireUser(request)
    const { id: orgId } = params

    // Check if user is org member
    requireOrgAccess(user.organizationId, orgId)

    // Check if user is org admin
    if (!user.permissions?.includes(Permission.ORG_ADMIN)) {
      throw Errors.FORBIDDEN
    }

    const body = await request.json() as {
      name?: string; city?: string; region?: string; phone?: string
      email?: string; website?: string; logo?: string
    }
    const { name, city, region, phone, email, website, logo } = body

    const organization = await organizationService.updateOrganization(orgId, {
      name,
      city,
      region,
      phone,
      email,
      website,
      logo,
    })

    return NextResponse.json(
      {
        success: true,
        data: organization,
      },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    )
  } catch (error) {
    console.error('Organization update error:', error)

    if (error === Errors.FORBIDDEN) {
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
        'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  )
}
