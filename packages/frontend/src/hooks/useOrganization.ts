import { useAuth } from './useAuth'
import { useOrganizationStore } from '@/stores/organizationStore'
import { organizationAPI } from '@/services/organization'

export const useOrganization = () => {
  const { accessToken } = useAuth()
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
      return org
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create organization'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const getOrganization = async (orgId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const org = await organizationAPI.get(accessToken!, orgId)
      setOrganization(org)
      if (org.advisors) {
        setAdvisors(org.advisors)
      }
      return org
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch organization'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

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
      setOrganization(org)
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
