import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/services/auth.service'
import { validateSignUp } from '@/utils/validators'
import { Errors } from '@/utils/errors'
import { sendError } from '@/middleware/auth'
import { handleCORS, addCORSHeaders } from '@/middleware/cors'

export async function OPTIONS(req: NextRequest) {
  return handleCORS(req)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const validation = validateSignUp(body)
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

    const result = await authService.signUp(body)

    const response = NextResponse.json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    })
    return addCORSHeaders(response, req)
  } catch (error) {
    console.error('Registration error:', error)

    let response
    if (error instanceof Error) {
      if (error.message.includes('already registered')) {
        response = sendError(Errors.USER_ALREADY_EXISTS, 409)
      } else {
        response = sendError(error, 400)
      }
    } else {
      response = sendError(Errors.INTERNAL_ERROR, 500)
    }

    return addCORSHeaders(response, req)
  }
}
