import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse } from '@shared/types'
import { requireUser } from '@/middleware/auth'
import { organizationService } from '@/services/organization.service'
import { advisorService } from '@/services/advisor.service'
import { requireOrgAccess, requirePermission } from '@/lib/permissions'
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

    const advisors = await organizationService.listOrganizationAdvisors(orgId)

    return NextResponse.json(
      {
        success: true,
        data: advisors,
      },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    )
  } catch (error) {
    console.error('List advisors error:', error)

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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const user = await requireUser(request)
    const { id: orgId } = params

    // Check if user is member of this organization
    requireOrgAccess(user.organizationId, orgId)

    // Check if user has permission to manage advisors
    requirePermission(user.permissions, 'advisor:manage')

    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Email is required', code: 'VALIDATION_ERROR' },
        },
        { status: 400 }
      )
    }

    const invite = await advisorService.sendInvite(orgId, email)

    return NextResponse.json(
      {
        success: true,
        data: invite,
      },
      {
        status: 201,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    )
  } catch (error) {
    console.error('Send invite error:', error)

    if (error instanceof Error && error.message.includes('already')) {
      return NextResponse.json(
        {
          success: false,
          error: { message: error.message, code: 'VALIDATION_ERROR' },
        },
        { status: 400 }
      )
    }

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
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  )
}
