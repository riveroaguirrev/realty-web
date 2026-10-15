import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/services/auth.service'
import { ApiError, Errors } from '@/utils/errors'
import { bearerToken, browserHashFromRequest } from '@/lib/auth-route'

export async function verifyAuth(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')

  if (!authHeader) {
    return {
      user: null,
      error: Errors.MISSING_TOKEN,
    }
  }

  const token = bearerToken(req)
  if (!token) return { user: null, error: Errors.INVALID_TOKEN }

  try {
    const user = await authService.getUserFromToken(token, browserHashFromRequest(req))
    return {
      user,
      error: null,
    }
  } catch (error) {
    return {
      user: null,
      error: error instanceof ApiError ? error : Errors.INVALID_TOKEN,
    }
  }
}

export async function requireUser(req: NextRequest) {
  const { user, error } = await verifyAuth(req)
  if (!user) throw error ?? Errors.UNAUTHORIZED
  return user
}

export function sendError(error: any, statusCode: number) {
  const safe = error instanceof ApiError ? error : new ApiError(statusCode, 'REQUEST_FAILED', 'No pudimos completar la solicitud.')
  return NextResponse.json(
    {
      success: false,
      error: {
        message: safe.message,
        code: safe.code,
      },
    },
    { status: safe.statusCode }
  )
}
