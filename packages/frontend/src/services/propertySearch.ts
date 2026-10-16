import { httpClient as client } from './api'
import { ApiResponse } from '@shared/types'

export const propertySearchAPI = {
  async search(
    token: string,
    filters?: {
      operation?: string
      currency?: string
      west?: number
      south?: number
      east?: number
      north?: number
      city?: string
      region?: string
      type?: string
      organizationId?: string
      priceMin?: number
      priceMax?: number
      bedroomsMin?: number
      bedroomsMax?: number
      bathroomsMin?: number
      bathroomsMax?: number
      areaMin?: number
      areaMax?: number
      page?: number
      pageSize?: number
    }
  ) {
    const params = new URLSearchParams()

    for (const key of ['west', 'south', 'east', 'north'] as const) { if (filters?.[key] !== undefined) params.append(key, String(filters[key])) }
    if (filters?.operation) params.append('operation', filters.operation)
    if (filters?.currency) params.append('currency', filters.currency)
    if (filters?.city) params.append('city', filters.city)
    if (filters?.region) params.append('region', filters.region)
    if (filters?.type) params.append('type', filters.type)
    if (filters?.organizationId) params.append('organizationId', filters.organizationId)
    if (filters?.priceMin !== undefined) params.append('priceMin', filters.priceMin.toString())
    if (filters?.priceMax !== undefined) params.append('priceMax', filters.priceMax.toString())
    if (filters?.bedroomsMin !== undefined) params.append('bedroomsMin', filters.bedroomsMin.toString())
    if (filters?.bedroomsMax !== undefined) params.append('bedroomsMax', filters.bedroomsMax.toString())
    if (filters?.bathroomsMin !== undefined) params.append('bathroomsMin', filters.bathroomsMin.toString())
    if (filters?.bathroomsMax !== undefined) params.append('bathroomsMax', filters.bathroomsMax.toString())
    if (filters?.areaMin !== undefined) params.append('areaMin', filters.areaMin.toString())
    if (filters?.areaMax !== undefined) params.append('areaMax', filters.areaMax.toString())
    params.append('page', (filters?.page || 1).toString())
    params.append('pageSize', (filters?.pageSize || 20).toString())

    const response = await client.get<ApiResponse<any>>(
      `/properties/search?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    if (!response.data.success) throw new Error(response.data.error?.message)
    return {
      properties: response.data.data || [],
      pagination: { ...response.data.meta, totalPages: Math.ceil((response.data.meta?.total || 0) / (response.data.meta?.pageSize || filters?.pageSize || 20)) },
    }
  },
}
