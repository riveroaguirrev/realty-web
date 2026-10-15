import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { fieldsFromError } from '@shared/validation/auth'
import { ApiError, Errors } from '@/utils/errors'
import { hashSecret, newBrowserSecret, rateLimit } from '@/services/session.service'

export const bearerToken = (req: NextRequest) => req.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1]
export function browserHashFromRequest(req: NextRequest): string {
  const secret = req.cookies.get('realty_browser')?.value
  return secret && /^[a-f0-9]{64}$/.test(secret) ? hashSecret(secret) : 'missing-browser-cookie'
}
export function errorResponse(error: unknown) {
  if (error instanceof ZodError) return NextResponse.json({
    success: false, error: { code: 'VALIDATION_ERROR', message: 'Revisa los campos indicados.', fieldErrors: fieldsFromError(error) },
  }, { status: 400 })
  if (error instanceof SyntaxError) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'El cuerpo de la solicitud no es válido.' } }, { status: 400 })
  const safe = error instanceof ApiError ? error : Errors.INTERNAL_ERROR
  if (!(error instanceof ApiError)) console.error('Request failed', error instanceof Error ? error.name : 'UnknownError')
  return NextResponse.json({ success: false, error: { code: safe.code, message: safe.message } }, { status: safe.statusCode })
}
export async function authRoute(req: NextRequest, work: (browserHash: string, token?: string) => Promise<unknown>) {
  const cookie = req.cookies.get('realty_browser')?.value
  const secret = cookie && /^[a-f0-9]{64}$/.test(cookie) ? cookie : newBrowserSecret()
  let response: NextResponse
  try {
    const origin = req.headers.get('origin')
    const allowed = (process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:5173,http://localhost:5174').split(',').map((value) => value.trim())
    if (origin && origin !== new URL(req.url).origin && !allowed.includes(origin)) return errorResponse(Errors.FORBIDDEN)
    if (process.env.TRUST_PROXY === 'true') {
      await rateLimit('ip:' + (req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'), 60, 300)
    }
    response = NextResponse.json({ success: true, data: await work(hashSecret(secret), bearerToken(req)) })
  } catch (error) { response = errorResponse(error) }
  response.cookies.set('realty_browser', secret, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.AUTH_COOKIE_SAME_SITE === 'none' ? 'none' : 'lax', path: '/api', maxAge: 365 * 24 * 60 * 60,
  })
  response.headers.set('Cache-Control', 'no-store')
  return response
}
