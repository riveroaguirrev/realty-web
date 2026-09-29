import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse } from '@shared/types'
import { requireUser } from '@/middleware/auth'
import { advisorService } from '@/services/advisor.service'
import { Errors } from '@/utils/errors'

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const user = await requireUser(request)

    const body = await request.json()
    const { code } = body

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Invite code is required', code: 'VALIDATION_ERROR' },
        },
        { status: 400 }
      )
    }

    const advisor = await advisorService.acceptInvite(code, user.id)

    return NextResponse.json(
      {
        success: true,
        data: {
          id: advisor.id,
          organizationId: advisor.organizationId,
          organizationName: advisor.organization?.name,
          role: advisor.role,
        },
      },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    )
  } catch (error) {
    console.error('Accept invite error:', error)

    if (error instanceof Error && error.message.includes('Invalid')) {
      return NextResponse.json(
        {
          success: false,
          error: { message: error.message, code: 'VALIDATION_ERROR' },
        },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message.includes('expired')) {
      return NextResponse.json(
        {
          success: false,
          error: { message: error.message, code: 'VALIDATION_ERROR' },
        },
        { status: 410 }
      )
    }

    if (error instanceof Error && error.message.includes('already been used')) {
      return NextResponse.json(
        {
          success: false,
          error: { message: error.message, code: 'VALIDATION_ERROR' },
        },
        { status: 409 }
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
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  )
}
