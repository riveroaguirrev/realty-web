import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { ApiResponse } from '@shared/types'
import { supabase } from './supabase'
import { authSessionIdentity, canRefreshRequest } from '@/utils/sessionIdentity'

// Use Vite's same-origin proxy for both localhost and 127.0.0.1.
const API_URL = import.meta.env.DEV ? '/api' : import.meta.env.VITE_API_URL || '/api'

export class ApiRequestError extends Error {
  constructor(message: string, public code?: string, public fieldErrors?: Record<string, string[]>, public status?: number) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

class ApiClient {
  readonly client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      withCredentials: true,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.client.interceptors.request.use(async (config) => {
      if (config.headers.Authorization) {
        const { data } = await supabase.auth.getSession()
        if (data.session) {
          const original = String(config.headers.Authorization).replace(/^Bearer /i, '')
          if (!canRefreshRequest(original, data.session.access_token)) throw new ApiRequestError('Tu sesión cambió. Vuelve a intentar la acción.', 'AUTH_CONTEXT_CHANGED')
          config.headers.Authorization = 'Bearer ' + data.session.access_token
        }
      }
      return config
    })
    this.client.interceptors.response.use(
      (response) => {
        const data = response.data as ApiResponse<any>
        if (!data.success) {
          throw new ApiRequestError(data.error?.message || 'No pudimos completar la solicitud.', data.error?.code, data.error?.fieldErrors)
        }
        return response
      },
      async (error) => {
        if (error instanceof ApiRequestError) throw error
        const detail = error.response?.data?.error
        if (['SESSION_REPLACED', 'INVALID_TOKEN', 'ACCOUNT_BLOCKED'].includes(detail?.code)) {
          const original = String(error.config?.headers?.Authorization ?? '').replace(/^Bearer /i, '')
          const { data } = await supabase.auth.getSession()
          if (data.session && authSessionIdentity(original) === authSessionIdentity(data.session.access_token)) {
            window.dispatchEvent(new CustomEvent('auth:invalid', { detail: detail.message }))
          }
        }
        throw new ApiRequestError(detail?.message || 'No pudimos conectar con el servidor. Inténtalo de nuevo.', detail?.code, detail?.fieldErrors, error.response?.status)
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
export const httpClient = apiClient.client
