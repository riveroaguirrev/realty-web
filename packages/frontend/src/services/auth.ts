import { SignUpPayload, AuthPayload, AuthResponse, User, LoginResult, RecoveryGrant } from '@shared/types'
import { apiClient } from './api'

export const authAPI = {
  register: async (payload: SignUpPayload): Promise<LoginResult> => {
    const res = await apiClient.post<LoginResult>('/auth/register', payload)
    return res.data
  },

  login: async (payload: AuthPayload): Promise<LoginResult> => {
    const res = await apiClient.post<LoginResult>('/auth/login', payload)
    return res.data
  },
  verify: async (payload: { purpose: string; email: string; code: string; challengeId?: string }, token?: string) =>
    (await apiClient.post<AuthResponse | (RecoveryGrant & { status: 'PASSWORD_RESET_REQUIRED' }) | { status: 'EMAIL_CHANGE_PENDING' } | { status: 'EMAIL_CHANGED'; user: User }>('/auth/verify', payload, token ? { headers: { Authorization: 'Bearer ' + token } } : undefined)).data,
  resend: async (payload: { purpose: string; email: string; challengeId?: string }, token?: string) =>
    (await apiClient.post('/auth/resend', payload, token ? { headers: { Authorization: 'Bearer ' + token } } : undefined)).data,
  recovery: async (email: string) => (await apiClient.post('/auth/recovery', { email })).data,
  resetPassword: async (payload: RecoveryGrant & { password: string; confirmPassword: string }) => (await apiClient.post('/auth/reset-password', payload)).data,
  changePassword: async (token: string, payload: { currentPassword: string; password: string; confirmPassword: string }) =>
    (await apiClient.post<AuthResponse>('/auth/password', payload, { headers: { Authorization: 'Bearer ' + token } })).data,
  changeEmail: async (token: string, payload: { email: string; currentPassword: string }) =>
    (await apiClient.post<{ challengeId: string; email: string; newEmail: string }>('/auth/email', payload, { headers: { Authorization: 'Bearer ' + token } })).data,
  logout: async (token: string) => (await apiClient.post('/auth/logout', {}, { headers: { Authorization: 'Bearer ' + token } })).data,

  getProfile: async (token: string): Promise<User> => {
    const res = await apiClient.get<User>('/auth/profile', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return res.data
  },

  updateProfile: async (
    token: string,
    data: Partial<{
      firstName: string
      lastName: string
      bio: string
      profileImage: string
      phone: string
    }>
  ): Promise<User> => {
    const res = await apiClient.put<User>('/auth/profile', data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return res.data
  },
}
