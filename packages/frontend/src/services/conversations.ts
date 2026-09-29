import axios from 'axios'
import { ApiResponse } from '@shared/types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const client = axios.create({
  baseURL: API_URL,
})

export const conversationsAPI = {
  async list(token: string, page = 1, pageSize = 20) {
    const response = await client.get<ApiResponse<any>>(
      `/conversations?page=${page}&pageSize=${pageSize}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    if (!response.data.success) throw new Error(response.data.error?.message)
    return {
      conversations: response.data.data || [],
      pagination: response.data.meta,
    }
  },

  async create(token: string, participantIds: string[], type = 'DIRECT', name?: string) {
    const response = await client.post<ApiResponse<any>>(
      '/conversations',
      { participantIds, type, name },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    if (!response.data.success) throw new Error(response.data.error?.message)
    return response.data.data
  },

  async get(token: string, conversationId: string) {
    const response = await client.get<ApiResponse<any>>(`/conversations/${conversationId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.data.success) throw new Error(response.data.error?.message)
    return response.data.data
  },

  async unreadCount(token: string): Promise<number> {
    const response = await client.get<ApiResponse<{ count: number }>>('/conversations/unread-count', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.data.success) throw new Error(response.data.error?.message)
    return response.data.data?.count ?? 0
  },

  async markAsRead(token: string, conversationId: string) {
    const response = await client.put<ApiResponse<any>>(
      `/conversations/${conversationId}/mark-read`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    if (!response.data.success) throw new Error(response.data.error?.message)
    return response.data.data
  },
}
