import { apiClient } from './api'

export const propertyAPI = {
  listProperties: async (filters?: any) => {
    const params = new URLSearchParams()
    if (filters?.page) params.append('page', filters.page.toString())
    if (filters?.pageSize) params.append('pageSize', filters.pageSize.toString())
    if (filters?.city) params.append('city', filters.city)
    if (filters?.region) params.append('region', filters.region)
    if (filters?.type) params.append('type', filters.type)
    if (filters?.priceMin) params.append('priceMin', filters.priceMin.toString())
    if (filters?.priceMax) params.append('priceMax', filters.priceMax.toString())

    const res = await apiClient.get(`/properties?${params.toString()}`)
    return res.data
  },

  getMyProperties: async (token: string, page = 1, pageSize = 10) => {
    const res = await apiClient.get(`/properties/my-properties?page=${page}&pageSize=${pageSize}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return res.data
  },

  get: async (token: string, id: string) => {
    const res = await apiClient.get(`/properties/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return res.data
  },

  uploadImage: async (token: string, file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await apiClient.post<{ url: string }>('/properties/images', formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': false,
      },
    })
    return res.data.url
  },

  createProperty: async (token: string, data: any) => {
    const res = await apiClient.post('/properties', data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return res.data
  },

  update: async (token: string, id: string, data: any) => {
    const res = await apiClient.put(`/properties/${id}`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return res.data
  },

  remove: async (token: string, id: string) => {
    const res = await apiClient.delete(`/properties/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return res.data
  },
}
