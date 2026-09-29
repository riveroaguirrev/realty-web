import { SignUpPayload, AuthPayload, AuthResponse, User } from '@shared/types'
import { apiClient } from './api'

export const authAPI = {
  register: async (payload: SignUpPayload): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/register', payload)
    return res.data
  },

  login: async (payload: AuthPayload): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/login', payload)
    return res.data
  },

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
