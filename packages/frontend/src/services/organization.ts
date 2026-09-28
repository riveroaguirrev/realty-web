import axios from 'axios'
import { ApiResponse } from '@shared/types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const client = axios.create({
  baseURL: API_URL,
})

export const organizationAPI = {
  async create(
    token: string,
    data: {
      name: string
      slug?: string
      city?: string
      region?: string
      phone?: string
      email?: string
      website?: string
      logo?: string
    }
  ) {
    const response = await client.post<ApiResponse<any>>('/organizations', data, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.data.success) throw new Error(response.data.error?.message)
    return response.data.data
  },

  async get(token: string, orgId: string) {
    const response = await client.get<ApiResponse<any>>(`/organizations/${orgId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.data.success) throw new Error(response.data.error?.message)
    return response.data.data
  },

  async update(
    token: string,
    orgId: string,
    data: {
      name?: string
      city?: string
      region?: string
      phone?: string
      email?: string
      website?: string
      logo?: string
    }
  ) {
    const response = await client.put<ApiResponse<any>>(`/organizations/${orgId}`, data, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.data.success) throw new Error(response.data.error?.message)
    return response.data.data
  },

  async listAdvisors(token: string, orgId: string) {
    const response = await client.get<ApiResponse<any>>(`/organizations/${orgId}/advisors`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.data.success) throw new Error(response.data.error?.message)
    return response.data.data || []
  },

  async sendInvite(token: string, orgId: string, email: string) {
    const response = await client.post<ApiResponse<any>>(
      `/organizations/${orgId}/advisors`,
      { email },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    if (!response.data.success) throw new Error(response.data.error?.message)
    return response.data.data
  },

  async removeAdvisor(token: string, orgId: string, advisorId: string) {
    const response = await client.delete<ApiResponse<any>>(
      `/organizations/${orgId}/advisors/${advisorId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    if (!response.data.success) throw new Error(response.data.error?.message)
    return response.data.data
  },

  async acceptInvite(token: string, code: string) {
    const response = await client.post<ApiResponse<any>>(
      '/organizations/invite/accept',
      { code },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    if (!response.data.success) throw new Error(response.data.error?.message)
    return response.data.data
  },

  async listProperties(token: string, orgId: string, page = 1, pageSize = 20) {
    const response = await client.get<ApiResponse<any>>(
      `/organizations/${orgId}/properties?page=${page}&pageSize=${pageSize}`,
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
