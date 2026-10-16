import { httpClient as client } from './api'
import { ApiResponse } from '@shared/types'

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

  async isFavorite(token: string, propertyId: string): Promise<boolean> {
    const response = await client.get<ApiResponse<{ isFavorite: boolean }>>(
      `/favorites/${propertyId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    if (!response.data.success) throw new Error(response.data.error?.message)
    return response.data.data?.isFavorite ?? false
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
