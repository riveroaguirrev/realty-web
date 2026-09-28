import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Organization {
  id: string
  name: string
  slug: string
  city?: string
  region?: string
  email?: string
  phone?: string
  website?: string
  logo?: string
}

export interface OrganizationState {
  organization: Organization | null
  advisors: any[]
  isLoading: boolean
  error: string | null

  setOrganization: (org: Organization | null) => void
  setAdvisors: (advisors: any[]) => void
  setIsLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearOrganization: () => void
}

export const useOrganizationStore = create<OrganizationState>()(
  persist(
    (set) => ({
      organization: null,
      advisors: [],
      isLoading: false,
      error: null,

      setOrganization: (org) => set({ organization: org }),
      setAdvisors: (advisors) => set({ advisors }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      clearOrganization: () =>
        set({
          organization: null,
          advisors: [],
          error: null,
        }),
    }),
    {
      name: 'organization-store',
      partialize: (state) => ({
        organization: state.organization,
      }),
    }
  )
)
