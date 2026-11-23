import { apiClient } from './api'
import type { PropertyCardProps } from '@/components/property/PropertyCard'

export interface PropertyMatch {
  propertyId: string
  score: number
  matchReason: string
  property: Omit<PropertyCardProps, 'price'> & { price: string | number }
}

export const matchingAPI = {
  async getSimilarProperties(token: string, propertyId: string, limit = 6, signal?: AbortSignal) {
    const { data } = await apiClient.get<PropertyMatch[]>(`/properties/${propertyId}/similar`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit },
      signal,
    })
    return data
  },
}
