import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/services/auth.service'
import { validateLogin } from '@/utils/validators'
import { Errors } from '@/utils/errors'
import { sendError } from '@/middleware/auth'
import { handleCORS, addCORSHeaders } from '@/middleware/cors'

export async function OPTIONS(req: NextRequest) {
  return handleCORS(req)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

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
      return addCORSHeaders(response, req)
    }

    const result = await authService.signIn(body)

    const response = NextResponse.json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    })
    return addCORSHeaders(response, req)
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

    return addCORSHeaders(response, req)
  }
}
