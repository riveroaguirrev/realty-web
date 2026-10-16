import { useCallback } from 'react'
import axios from 'axios'
import { useAuth } from './useAuth'
import { useOrganizationStore } from '@/stores/organizationStore'
import { organizationAPI } from '@/services/organization'

function organizationError(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'No pudimos conectar con el servidor. Comprueba tu conexión y vuelve a intentar.'
    }
    if (error.response.status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.'
    return error.response.data?.error?.message || fallback
  }
  return error instanceof Error ? error.message : fallback
}

export const useOrganization = () => {
  const { accessToken, getProfile } = useAuth()
  const {
    organization,
    advisors,
    isLoading,
    error,
    setOrganization,
    setAdvisors,
    setIsLoading,
    setError,
    clearOrganization,
  } = useOrganizationStore()

  const createOrganization = async (name: string, data?: any) => {
    setIsLoading(true)
    setError(null)
    try {
      const org = await organizationAPI.create(accessToken!, { name, ...data })
      setOrganization(org)
      await getProfile()
      return org
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create organization'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const getOrganization = useCallback(async (orgId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const org = await organizationAPI.get(accessToken!, orgId)
      setOrganization(org)
      setAdvisors(org.advisors || [])
      return org
    } catch (err) {
      const message = organizationError(err, 'No pudimos cargar tu inmobiliaria. Vuelve a intentar.')
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, setIsLoading, setError, setOrganization, setAdvisors])

  const updateOrganization = async (orgId: string, data: any) => {
    setIsLoading(true)
    setError(null)
    try {
      const org = await organizationAPI.update(accessToken!, orgId, data)
      setOrganization(org)
      return org
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update organization'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const listAdvisors = async (orgId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const advisors = await organizationAPI.listAdvisors(accessToken!, orgId)
      setAdvisors(advisors)
      return advisors
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch advisors'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const sendInvite = async (orgId: string, email: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const invite = await organizationAPI.sendInvite(accessToken!, orgId, email)
      return invite
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send invite'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const removeAdvisor = async (orgId: string, advisorId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      await organizationAPI.removeAdvisor(accessToken!, orgId, advisorId)
      // Refresh advisors list
      await listAdvisors(orgId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove advisor'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const acceptInvite = async (code: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const org = await organizationAPI.acceptInvite(accessToken!, code)
      await getProfile()
      const updated = await organizationAPI.get(accessToken!, org.organizationId)
      setOrganization(updated)
      return org
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to accept invite'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return {
    organization,
    advisors,
    isLoading,
    error,
    createOrganization,
    getOrganization,
    updateOrganization,
    listAdvisors,
    sendInvite,
    removeAdvisor,
    acceptInvite,
    clearOrganization,
    clearError: () => setError(null),
  }
}
