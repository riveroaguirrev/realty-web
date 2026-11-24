import { useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { authAPI } from '@/services/auth'
import { acceptSession, clearSession } from '@/services/authSession'
import { SignUpPayload, AuthPayload, User } from '@shared/types'
import { canRefreshRequest } from '@/utils/sessionIdentity'

export const useAuth = () => {
  const state = useAuthStore()
  const run = useCallback(async <T,>(operation: () => Promise<T>) => {
    useAuthStore.getState().setIsLoading(true)
    useAuthStore.getState().setError(null)
    try { return await operation() }
    catch (error) {
      useAuthStore.getState().setError(error instanceof Error ? error.message : 'No pudimos completar la solicitud.')
      throw error
    } finally { useAuthStore.getState().setIsLoading(false) }
  }, [])
  const register = useCallback((payload: SignUpPayload) => run(async () => {
    const response = await authAPI.register(payload)
    if (response.status === 'AUTHENTICATED') await acceptSession(response)
    return response
  }), [run])
  const login = useCallback((payload: AuthPayload) => run(async () => {
    const response = await authAPI.login(payload)
    if (response.status === 'AUTHENTICATED') await acceptSession(response)
    return response
  }), [run])
  const getProfile = useCallback((token?: string) => run(async () => {
    const current = token ?? useAuthStore.getState().accessToken
    if (!current) throw new Error('Inicia sesión para continuar.')
    const user = await authAPI.getProfile(current)
    useAuthStore.getState().setUser(user)
    return user
  }), [run])
  const updateProfile = useCallback((data: Partial<User>) => run(async () => {
    const token = useAuthStore.getState().accessToken
    if (!token) throw new Error('Inicia sesión para continuar.')
    const user = await authAPI.updateProfile(token, data)
    useAuthStore.getState().setUser(user)
    return user
  }), [run])
  const uploadProfilePhoto = useCallback((file: File) => run(async () => {
    const token = useAuthStore.getState().accessToken
    if (!token) throw new Error('Inicia sesión para continuar.')
    const profile = await authAPI.uploadProfilePhoto(token, file)
    const current = useAuthStore.getState()
    if (current.user?.id === profile.id && current.accessToken && canRefreshRequest(token, current.accessToken)) {
      current.setUser({ ...current.user, profileImage: profile.profileImage })
    }
    return profile
  }), [run])
  const logout = useCallback(async () => {
    const token = useAuthStore.getState().accessToken
    try { if (token) await authAPI.logout(token) }
    finally {
      window.dispatchEvent(new Event('auth:clear-cache'))
      await clearSession()
    }
  }, [])
  return { ...state, isAuthenticated: !!state.user && !!state.accessToken, register, login, getProfile, updateProfile, uploadProfilePhoto, logout }
}
