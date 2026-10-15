import { emailSchema, fieldsFromError } from '@shared/validation/auth'
import { ZodError } from 'zod'
import { ApiRequestError } from '@/services/api'
import { PendingAuth } from '@shared/types'

export const safeNext = (value: string | null | undefined, fallback = '/dashboard') => {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback
  const url = new URL(value, window.location.origin)
  return url.origin === window.location.origin && (url.pathname === '/auth/profile' || !url.pathname.startsWith('/auth/')) ? url.pathname + url.search : fallback
}
export const authLink = (path: string, next: string) => path + '?next=' + encodeURIComponent(next)
export const formErrors = (error: unknown): Record<string, string[]> =>
  error instanceof ZodError ? fieldsFromError(error) : error instanceof ApiRequestError && error.fieldErrors ? error.fieldErrors :
    { _form: [error instanceof Error ? error.message : 'No pudimos completar la solicitud.'] }
export interface PendingFlow {
  purpose: 'signup' | 'device' | 'recovery'
  email: string
  challengeId?: string
  next: string
  sentAt: number
}
export function savePending(result: PendingAuth, next: string) {
  const pending: PendingFlow = { purpose: result.status === 'DEVICE_VERIFICATION_REQUIRED' ? 'device' : 'signup', email: result.email, challengeId: result.challengeId, next, sentAt: Date.now() }
  sessionStorage.setItem('auth-pending', JSON.stringify(pending))
}
export function readPending(): PendingFlow | null {
  try {
    const input = JSON.parse(sessionStorage.getItem('auth-pending') ?? 'null')
    if (!input || !['signup', 'device', 'recovery'].includes(input.purpose) || !emailSchema.safeParse(input.email).success) return null
    return { ...input, next: safeNext(input.next), sentAt: typeof input.sentAt === 'number' ? input.sentAt : 0 }
  } catch { return null }
}
export const clearPending = () => sessionStorage.removeItem('auth-pending')
