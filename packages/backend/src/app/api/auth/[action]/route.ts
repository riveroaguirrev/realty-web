import { NextRequest } from 'next/server'
import { changeEmailSchema, changePasswordSchema, resendSchema, resetSchema, verifySchema, emailSchema } from '@shared/validation/auth'
import { authRoute } from '@/lib/auth-route'
import { authService } from '@/services/auth.service'
import { ApiError, Errors } from '@/utils/errors'
export const POST = (req: NextRequest, { params }: { params: { action: string } }) => authRoute(req, async (browserHash, token) => {
  if (params.action === 'logout') {
    if (!token) throw Errors.UNAUTHORIZED
    return authService.logout(token, browserHash)
  }
  const body: unknown = await req.json()
  switch (params.action) {
    case 'verify': return authService.verify(verifySchema.parse(body), browserHash, token)
    case 'resend': return authService.resend(resendSchema.parse(body), browserHash, token)
    case 'recovery': return authService.resend({ purpose: 'recovery', email: emailSchema.parse((body as { email?: unknown } | null)?.email) }, browserHash)
    case 'reset-password': return authService.resetPassword(resetSchema.parse(body), browserHash)
    case 'password':
      if (!token) throw Errors.UNAUTHORIZED
      return authService.changePassword(token, changePasswordSchema.parse(body), browserHash)
    case 'email':
      if (!token) throw Errors.UNAUTHORIZED
      return authService.changeEmail(token, changeEmailSchema.parse(body), browserHash)
    default: throw new ApiError(404, 'NOT_FOUND', 'Operación no encontrada.')
  }
})
