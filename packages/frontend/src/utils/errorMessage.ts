import axios from 'axios'

export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error?.message ?? error.message
  }
  return error instanceof Error ? error.message : fallback
}
