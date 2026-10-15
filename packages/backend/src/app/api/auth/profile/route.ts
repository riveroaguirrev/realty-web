import { NextRequest, NextResponse } from 'next/server'
import { bearerToken, browserHashFromRequest, errorResponse } from '@/lib/auth-route'
import { authService } from '@/services/auth.service'
import { Errors } from '@/utils/errors'
export async function GET(req: NextRequest) {
  try {
    const token = bearerToken(req)
    if (!token) throw Errors.UNAUTHORIZED
    return NextResponse.json({ success: true, data: await authService.getUserFromToken(token, browserHashFromRequest(req)) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return errorResponse(error) }
}
export async function PUT(req: NextRequest) {
  try {
    const token = bearerToken(req)
    if (!token) throw Errors.UNAUTHORIZED
    const user = await authService.getUserFromToken(token, browserHashFromRequest(req))
    return NextResponse.json({ success: true, data: await authService.updateProfile(user.id, await req.json()) })
  } catch (error) { return errorResponse(error) }
}
