import axios from 'axios'
import { API_BASE_URL } from '@/config/api'

export interface PropertyMatch {
  propertyId: string
  score: number
  matchReason: string
  property: any
}

export interface MatchingResponse {
  success: boolean
  data: PropertyMatch[]
  meta: {
    count: number
  }
}

export const matchingAPI = {
  async getSimilarProperties(
    propertyId: string,
    limit = 6
  ): Promise<PropertyMatch[]> {
    try {
      const response = await axios.get<MatchingResponse>(
        `${API_BASE_URL}/properties/${propertyId}/similar?limit=${limit}`
      )

      if (response.data.success) {
        return response.data.data
      }

      throw new Error('Failed to get similar properties')
    } catch (error) {
      console.error('Error fetching similar properties:', error)
      throw error
    }
  },
}
