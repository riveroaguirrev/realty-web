import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, sendError } from '@/middleware/auth'
import { authService } from '@/services/auth.service'
import { Errors } from '@/utils/errors'

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req)

    if (!auth.user) {
      const response = sendError(Errors.UNAUTHORIZED, 401)
      return response
    }

    const response = NextResponse.json({
      success: true,
      data: auth.user,
    })
    return response
  } catch (error) {
    console.error('Get profile error:', error)
    const response = sendError(Errors.INTERNAL_ERROR, 500)
    return response
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await verifyAuth(req)

    if (!auth.user) {
      const response = sendError(Errors.UNAUTHORIZED, 401)
      return response
    }

    const body = await req.json()

    const updatedUser = await authService.updateProfile(auth.user.id, body)

    const response = NextResponse.json({
      success: true,
      data: updatedUser,
    })
    return response
  } catch (error) {
    console.error('Update profile error:', error)
    const response = sendError(error || Errors.INTERNAL_ERROR, 400)
    return response
  }
}
