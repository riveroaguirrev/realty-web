import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse, Permission } from '@shared/types'
import { requireUser } from '@/middleware/auth'
import { advisorService } from '@/services/advisor.service'
import { requireOrgAccess, requirePermission } from '@/lib/permissions'
import { Errors } from '@/utils/errors'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; advisorId: string } }
): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const user = await requireUser(request)
    const { id: orgId, advisorId } = params

    // Check if user is member of this organization
    requireOrgAccess(user.organizationId, orgId)

    // Check if user has permission to manage advisors
    requirePermission(user.permissions, Permission.ADVISOR_MANAGE)

    // Prevent self-removal
    if (user.id === advisorId) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Cannot remove yourself from organization', code: 'VALIDATION_ERROR' },
        },
        { status: 400 }
      )
    }

    const advisor = await advisorService.removeAdvisor(orgId, advisorId)

    return NextResponse.json(
      {
        success: true,
        data: advisor,
      },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    )
  } catch (error) {
    console.error('Remove advisor error:', error)

    if (error instanceof Error && error.message.includes('last director')) {
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
        error: { message: Errors.USER_NOT_FOUND.message, code: Errors.USER_NOT_FOUND.code },
      },
      { status: 404 }
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
        'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  )
}
