import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, sendError } from '@/middleware/auth'
import { authService } from '@/services/auth.service'
import { Errors } from '@/utils/errors'
import { handleCORS, addCORSHeaders } from '@/middleware/cors'

export async function OPTIONS(req: NextRequest) {
  return handleCORS(req)
}

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req)

    if (!auth.user) {
      const response = sendError(Errors.UNAUTHORIZED, 401)
      return addCORSHeaders(response, req)
    }

    const response = NextResponse.json({
      success: true,
      data: auth.user,
    })
    return addCORSHeaders(response, req)
  } catch (error) {
    console.error('Get profile error:', error)
    const response = sendError(Errors.INTERNAL_ERROR, 500)
    return addCORSHeaders(response, req)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await verifyAuth(req)

    if (!auth.user) {
      const response = sendError(Errors.UNAUTHORIZED, 401)
      return addCORSHeaders(response, req)
    }

    const body = await req.json()

    const updatedUser = await authService.updateProfile(auth.user.id, body)

    const response = NextResponse.json({
      success: true,
      data: updatedUser,
    })
    return addCORSHeaders(response, req)
  } catch (error) {
    console.error('Update profile error:', error)
    const response = sendError(error || Errors.INTERNAL_ERROR, 400)
    return addCORSHeaders(response, req)
  }
}
