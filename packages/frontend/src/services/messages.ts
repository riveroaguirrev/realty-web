import { httpClient as client } from './api'
import { ApiResponse } from '@shared/types'
import type { ConversationMessage } from '@/types/messaging'

export const messagesAPI = {
  async list(token: string, conversationId: string, page = 1, pageSize = 20) {
    const response = await client.get<ApiResponse<ConversationMessage[]>>(
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

  async attachment(token: string, conversationId: string, messageId: string, attachmentId: string) {
    const response = await client.get<ApiResponse<{ url: string; downloadUrl: string }>>(
      `/conversations/${conversationId}/messages/${messageId}/attachments/${attachmentId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    return response.data.data!
  },

  async send(token: string, conversationId: string, content: string, files: File[] = []) {
    const form = new FormData()
    form.set('content', content)
    files.forEach(file => form.append('files', file))
    const response = await client.post<ApiResponse<any>>(
      `/conversations/${conversationId}/messages`,
      files.length ? form : { content },
      {
        headers: { Authorization: `Bearer ${token}`, ...(files.length ? { 'Content-Type': undefined } : {}) },
        timeout: 60000,
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
