import { ReactNode, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'

interface ProtectedRouteProps {
  children: ReactNode
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, user, accessToken, getProfile, logout } = useAuth()
  const navigate = useNavigate()

  // The token survives a page reload (localStorage) but the user profile does not.
  const isRestoringSession = Boolean(accessToken) && !user

  useEffect(() => {
    if (!isRestoringSession) return
    getProfile().catch(() => logout())
  }, [isRestoringSession])

  useEffect(() => {
    if (!isLoading && !isRestoringSession && !isAuthenticated) {
      navigate('/auth/login')
    }
  }, [isAuthenticated, isLoading, isRestoringSession, navigate])

  if ((isLoading && !user) || isRestoringSession) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Preparando tu espacio...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
