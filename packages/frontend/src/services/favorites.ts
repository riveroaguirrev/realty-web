import axios from 'axios'
import { ApiResponse } from '@shared/types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const client = axios.create({
  baseURL: API_URL,
})

export const favoritesAPI = {
  async add(token: string, propertyId: string) {
    const response = await client.post<ApiResponse<any>>(
      '/favorites',
      { propertyId },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    if (!response.data.success) throw new Error(response.data.error?.message)
    return response.data.data
  },

  async remove(token: string, propertyId: string) {
    const response = await client.delete<ApiResponse<any>>(`/favorites/${propertyId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.data.success) throw new Error(response.data.error?.message)
    return response.data.data
  },

  async list(token: string, page = 1, pageSize = 10) {
    const response = await client.get<ApiResponse<any>>(
      `/favorites?page=${page}&pageSize=${pageSize}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    if (!response.data.success) throw new Error(response.data.error?.message)
    return {
      properties: response.data.data || [],
      pagination: response.data.meta,
    }
  },
}
