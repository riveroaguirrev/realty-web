import { create } from 'zustand'
import { User } from '@shared/types'

interface AuthState {
  user: User | null
  accessToken: string | null
  isLoading: boolean
  error: string | null
  isReady: boolean
  setReady: (ready: boolean) => void

  setUser: (user: User | null) => void
  setAccessToken: (token: string | null) => void
  setIsLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isLoading: false,
  error: null,
  isReady: false,
  setReady: (isReady) => set({ isReady }),

  setUser: (user) => set({ user }),
  setAccessToken: (token) => {
    set({ accessToken: token })
  },
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  logout: () => {
    localStorage.removeItem('accessToken')
    set({ user: null, accessToken: null, error: null })
  },
}))
