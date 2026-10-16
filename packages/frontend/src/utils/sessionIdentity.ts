// This is only an obsolete-request check, never an authentication check.
export function authSessionIdentity(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.session_id === 'string' ? payload.session_id : null
  } catch { return null }
}
export function canRefreshRequest(originalToken: string, refreshedToken: string): boolean {
  if (originalToken === refreshedToken) return true
  const original = authSessionIdentity(originalToken)
  return original !== null && original === authSessionIdentity(refreshedToken)
}
