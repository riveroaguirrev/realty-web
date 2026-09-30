import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/services/auth.service'
import { validateLogin } from '@/utils/validators'
import { Errors } from '@/utils/errors'
import { sendError } from '@/middleware/auth'
import type { AuthPayload } from '@shared/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as AuthPayload

    const validation = validateLogin(body)
    if (!validation.isValid) {
      const response = NextResponse.json(
        {
          success: false,
          error: {
            message: validation.errors.join(', '),
            code: 'VALIDATION_ERROR',
          },
        },
        { status: 400 }
      )
      return response
    }

    const result = await authService.signIn(body)

    const response = NextResponse.json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    })
    return response
  } catch (error) {
    console.error('Login error:', error)

    let response
    if (error instanceof Error && error.message === Errors.INVALID_CREDENTIALS.message) {
      response = sendError(Errors.INVALID_CREDENTIALS, 401)
    } else if (error instanceof Error && error.message === Errors.USER_NOT_FOUND.message) {
      response = sendError(Errors.USER_NOT_FOUND, 404)
    } else {
      response = sendError(error || Errors.INTERNAL_ERROR, 400)
    }

    return response
  }
}
