import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { authAPI } from '@/services/auth'
import { supabase } from '@/services/supabase'
import { clearSession } from '@/services/authSession'
import { useOrganizationStore } from '@/stores/organizationStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { realtimeClient } from '@/services/realtime'

export function AuthSessionLifecycle() {
  const query = useQueryClient()
  useEffect(() => {
    let cancelled = false
    let version = 0
    const resetPrivateData = () => {
      query.clear()
      useOrganizationStore.getState().clearOrganization()
      useNotificationStore.setState({ notifications: [] })
      sessionStorage.removeItem('auth-email-change')
      void realtimeClient.removeAllChannels()
    }
    const restore = async () => {
      const current = ++version
      const { data } = await supabase.auth.getSession()
      if (cancelled || current !== version) return
      if (!data.session) {
        resetPrivateData()
        const message = useAuthStore.getState().error
        useAuthStore.getState().logout()
        useAuthStore.getState().setError(message)
        useAuthStore.getState().setReady(true)
        return
      }
      const previousUser = useAuthStore.getState().user
      if (previousUser && previousUser.id !== data.session.user.id) {
        resetPrivateData()
        useAuthStore.getState().setUser(null)
      }
      useAuthStore.getState().setAccessToken(data.session.access_token)
      try {
        const user = await authAPI.getProfile(data.session.access_token)
        if (cancelled || current !== version) return
        const previous = useAuthStore.getState().user
        if (previous && (previous.organizationId !== user.organizationId || previous.role !== user.role || previous.roleInOrganization !== user.roleInOrganization)) {
          query.clear()
          useOrganizationStore.getState().clearOrganization()
        }
        useAuthStore.getState().setUser(user)
        useAuthStore.getState().setAccessToken(data.session.access_token)
      } catch {
        if (!cancelled && current === version && !useAuthStore.getState().user) {
          useAuthStore.getState().setError('No pudimos restaurar tu sesión. Comprueba tu conexión y reintenta.')
        }
      } finally {
        if (!cancelled) useAuthStore.getState().setReady(true)
      }
    }
    const invalid = (event: Event) => {
      version++
      query.clear()
      void clearSession((event as CustomEvent<string>).detail)
    }
    const clearCache = () => query.clear()
    window.addEventListener('auth:invalid', invalid)
    window.addEventListener('auth:clear-cache', clearCache)
    window.addEventListener('focus', restore)
    localStorage.removeItem('accessToken')
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        version++
        resetPrivateData()
        const message = useAuthStore.getState().error
        useAuthStore.getState().logout()
        useAuthStore.getState().setError(message)
        useAuthStore.getState().setReady(true)
      } else if (session) {
        version++
        if (useAuthStore.getState().user?.id && useAuthStore.getState().user?.id !== session.user.id) {
          resetPrivateData()
          useAuthStore.getState().setUser(null)
        }
        useAuthStore.getState().setAccessToken(session.access_token)
        // Never await another Auth SDK call from within its locked callback.
        setTimeout(() => { if (!cancelled) void restore() }, 0)
      }
    })
    void restore()
    const interval = window.setInterval(() => { void restore() }, 30000)
    return () => {
      cancelled = true
      subscription.unsubscribe()
      window.clearInterval(interval)
      window.removeEventListener('auth:invalid', invalid)
      window.removeEventListener('auth:clear-cache', clearCache)
      window.removeEventListener('focus', restore)
    }
  }, [query])
  return null
}
