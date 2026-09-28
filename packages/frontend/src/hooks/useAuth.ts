import { useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { authAPI } from '@/services/auth'
import { SignUpPayload, AuthPayload, User } from '@shared/types'

export const useAuth = () => {
  const { user, accessToken, isLoading, error, setUser, setAccessToken, setIsLoading, setError, logout } =
    useAuthStore()

  const register = useCallback(
    async (payload: SignUpPayload) => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await authAPI.register(payload)
        setUser(response.user)
        setAccessToken(response.accessToken)
        return response
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Registration failed'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [setUser, setAccessToken, setIsLoading, setError]
  )

  const login = useCallback(
    async (payload: AuthPayload) => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await authAPI.login(payload)
        setUser(response.user)
        setAccessToken(response.accessToken)
        return response
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Login failed'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [setUser, setAccessToken, setIsLoading, setError]
  )

  const getProfile = useCallback(
    async (token?: string) => {
      const tokenToUse = token || accessToken
      if (!tokenToUse) throw new Error('No access token available')

      setIsLoading(true)
      setError(null)
      try {
        const profile = await authAPI.getProfile(tokenToUse)
        setUser(profile)
        return profile
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch profile'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken, setUser, setIsLoading, setError]
  )

  const updateProfile = useCallback(
    async (data: Partial<User>) => {
      if (!accessToken) throw new Error('No access token available')

      setIsLoading(true)
      setError(null)
      try {
        const updated = await authAPI.updateProfile(accessToken, data)
        setUser(updated)
        return updated
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update profile'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken, setUser, setIsLoading, setError]
  )

  const isAuthenticated = !!user && !!accessToken

  return {
    user,
    accessToken,
    isLoading,
    error,
    isAuthenticated,
    register,
    login,
    logout,
    getProfile,
    updateProfile,
  }
}
