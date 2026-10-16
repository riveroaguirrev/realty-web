import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { UserRole } from '@shared/types'
import { useAuth } from '@/hooks/useAuth'
export const ProtectedRoute = ({ children, advisorsOnly = false }: { children: ReactNode; advisorsOnly?: boolean }) => {
  const { isReady, isAuthenticated, accessToken, user, error, getProfile } = useAuth()
  const location = useLocation()
  if (!isReady) return <div className="loading-panel" role="status">Preparando tu espacio…</div>
  if (accessToken && !user) return <div className="empty-panel" role="alert"><p>{error || 'No pudimos restaurar tu sesión.'}</p><button className="button button-primary" onClick={() => { void getProfile().catch(() => {}) }}>Reintentar</button></div>
  if (!isAuthenticated) return <Navigate to={'/auth/login?next=' + encodeURIComponent(location.pathname + location.search)} replace />
  if (advisorsOnly && user?.role !== UserRole.ADVISOR) return <Navigate to="/search" replace />
  return <>{children}</>
}
