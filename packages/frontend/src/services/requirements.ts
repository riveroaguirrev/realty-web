import { apiClient } from './api'
import type { RequirementDetail, RequirementInput, RequirementRecord, RequirementStatus } from '@shared/types/requirements'
const config = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } })
export const requirementsAPI = {
  list: (token: string, mine = false, page = 1) => apiClient.get<RequirementRecord[]>(`/requirements?mine=${mine}&page=${page}`, config(token)),
  get: (token: string, id: string) => apiClient.get<RequirementDetail>(`/requirements/${id}`, config(token)),
  create: (token: string, data: RequirementInput) => apiClient.post<RequirementRecord>('/requirements', data, config(token)),
  update: (token: string, id: string, data: RequirementInput | { status: RequirementStatus }) => apiClient.put<RequirementRecord>(`/requirements/${id}`, data, config(token)),
}
export interface RequirementNotice { id: string; title: string; message: string; actionUrl: string; createdAt: string }
export const requirementNotifications = {
  list: (token: string) => apiClient.get<RequirementNotice[]>('/notifications', config(token)),
  read: (token: string, id: string) => apiClient.put(`/notifications/${id}`, {}, config(token)),
  async enable(token: string) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) throw new Error('Este navegador no admite notificaciones push.')
    const { data } = await apiClient.get<{ publicKey: string | null }>('/notifications/subscriptions', config(token))
    if (!data.publicKey) throw new Error('Las notificaciones push aún no están configuradas en el servidor.')
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') throw new Error('Activa el permiso de notificaciones en tu navegador para recibir avisos.')
    await navigator.serviceWorker.register('/requirements-sw.js')
    const registration = await navigator.serviceWorker.ready
    const padded = data.publicKey.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - data.publicKey.length % 4) % 4)
    const key = Uint8Array.from(atob(padded), char => char.charCodeAt(0))
    const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
    await apiClient.post('/notifications/subscriptions', subscription.toJSON(), config(token))
  },
  async disable(token: string) {
    const registration = await navigator.serviceWorker.getRegistration('/requirements-sw.js')
    const subscription = await registration?.pushManager.getSubscription()
    if (subscription) {
      await subscription.unsubscribe()
      await apiClient.delete('/notifications/subscriptions', { ...config(token), data: { endpoint: subscription.endpoint }, timeout: 5000 })
    }
  },
}
export const requirementError = (error: unknown) => {
  const response = error as { response?: { data?: { error?: { message?: string } } } }
  return response.response?.data?.error?.message || (error instanceof Error ? error.message : 'No se pudo completar la acción.')
}
