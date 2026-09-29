import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/services/auth.service'
import { Errors } from '@/utils/errors'

export async function verifyAuth(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')

  if (!authHeader) {
    return {
      user: null,
      error: Errors.MISSING_TOKEN,
    }
  }

  const token = authHeader.replace('Bearer ', '')

  try {
    const user = await authService.getUserFromToken(token)
    return {
      user,
      error: null,
    }
  } catch (error) {
    return {
      user: null,
      error: Errors.INVALID_TOKEN,
    }
  }
}

export async function requireUser(req: NextRequest) {
  const { user } = await verifyAuth(req)
  if (!user) throw Errors.UNAUTHORIZED
  return user
}

export function sendError(error: any, statusCode: number) {
  return NextResponse.json(
    {
      success: false,
      error: {
        message: error.message || 'An error occurred',
        code: error.code,
      },
    },
    { status: statusCode }
  )
}
