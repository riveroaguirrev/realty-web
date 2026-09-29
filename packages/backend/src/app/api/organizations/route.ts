import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse } from '@shared/types'
import { requireUser } from '@/middleware/auth'
import { organizationService } from '@/services/organization.service'
import { Errors } from '@/utils/errors'

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const user = await requireUser(request)

    const body = await request.json()
    const { name, slug, city, region, phone, email, website, logo } = body

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Organization name is required', code: 'VALIDATION_ERROR' },
        },
        { status: 400 }
      )
    }

    const organization = await organizationService.createOrganization(user.id, {
      name,
      slug,
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
        status: 201,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    )
  } catch (error) {
    console.error('Organization creation error:', error)

    if (error instanceof Error && error.message.includes('slug')) {
      return NextResponse.json(
        {
          success: false,
          error: { message: error.message, code: 'VALIDATION_ERROR' },
        },
        { status: 400 }
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
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  )
}
