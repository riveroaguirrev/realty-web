import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { ApiResponse } from '@shared/types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.client.interceptors.response.use(
      (response) => {
        const data = response.data as ApiResponse<any>
        if (!data.success) {
          throw new Error(data.error?.message || 'Request failed')
        }
        return response
      },
      (error) => {
        console.error('API error:', error)
        throw error
      }
    )
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig) {
    const response = await this.client.get<ApiResponse<T>>(url, config)
    return { data: response.data.data as T, meta: response.data.meta }
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    const response = await this.client.post<ApiResponse<T>>(url, data, config)
    return { data: response.data.data as T, meta: response.data.meta }
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    const response = await this.client.put<ApiResponse<T>>(url, data, config)
    return { data: response.data.data as T, meta: response.data.meta }
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig) {
    const response = await this.client.delete<ApiResponse<T>>(url, config)
    return { data: response.data.data as T, meta: response.data.meta }
  }
}

export const apiClient = new ApiClient()
