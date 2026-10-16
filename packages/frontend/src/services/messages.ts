import { httpClient as client } from './api'
import { ApiResponse } from '@shared/types'

export const messagesAPI = {
  async list(token: string, conversationId: string, page = 1, pageSize = 20) {
    const response = await client.get<ApiResponse<any>>(
      `/conversations/${conversationId}/messages?page=${page}&pageSize=${pageSize}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    if (!response.data.success) throw new Error(response.data.error?.message)
    return {
      messages: response.data.data || [],
      pagination: response.data.meta,
    }
  },

  async send(token: string, conversationId: string, content: string) {
    const response = await client.post<ApiResponse<any>>(
      `/conversations/${conversationId}/messages`,
      { content },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    if (!response.data.success) throw new Error(response.data.error?.message)
    return response.data.data
  },

  async edit(token: string, conversationId: string, messageId: string, content: string) {
    const response = await client.put<ApiResponse<any>>(
      `/conversations/${conversationId}/messages/${messageId}`,
      { content },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    if (!response.data.success) throw new Error(response.data.error?.message)
    return response.data.data
  },

  async delete(token: string, conversationId: string, messageId: string) {
    const response = await client.delete<ApiResponse<any>>(
      `/conversations/${conversationId}/messages/${messageId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    if (!response.data.success) throw new Error(response.data.error?.message)
    return response.data.data
  },
}
