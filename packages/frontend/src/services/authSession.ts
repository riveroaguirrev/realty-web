import { AuthResponse } from '@shared/types'
import { useAuthStore } from '@/stores/authStore'
import { useOrganizationStore } from '@/stores/organizationStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { supabase } from './supabase'
import { realtimeClient } from './realtime'
import { requirementNotifications } from './requirements'

async function removeDevicePush(token: string | null) {
  if (token && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try { await requirementNotifications.disable(token) } catch { /* A signed-out browser is still unsubscribed locally. */ }
  }
}

export async function clearSession(message?: string) {
  await removeDevicePush(useAuthStore.getState().accessToken)
  window.dispatchEvent(new Event('auth:clear-cache'))
  sessionStorage.removeItem('auth-email-change')
  useAuthStore.getState().logout()
  useAuthStore.getState().setError(message ?? null)
  useOrganizationStore.getState().clearOrganization()
  useNotificationStore.setState({ notifications: [] })
  await realtimeClient.removeAllChannels()
  await supabase.auth.signOut({ scope: 'local' })
}
export async function acceptSession(response: AuthResponse) {
  const previous = useAuthStore.getState().user
  if (previous?.id && previous.id !== response.user.id) {
    await removeDevicePush(useAuthStore.getState().accessToken)
    useOrganizationStore.getState().clearOrganization()
    useNotificationStore.setState({ notifications: [] })
    await realtimeClient.removeAllChannels()
    window.dispatchEvent(new Event('auth:clear-cache'))
  }
  const { error } = await supabase.auth.setSession({ access_token: response.accessToken, refresh_token: response.refreshToken })
  if (error) throw new Error('No pudimos guardar la sesión. Vuelve a iniciar sesión.')
  useAuthStore.getState().setUser(response.user)
  useAuthStore.getState().setAccessToken(response.accessToken)
}
