import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { propertyAPI } from '@/services/property'
import { PropertyCard } from '@/components/property/PropertyCard'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'

interface Property {
  id: string
  title: string
  price: number
  type: string
  city: string
  bedrooms?: number
  bathrooms?: number
  areaSquareMeters?: number
  images?: string[]
}

export const Properties = () => {
  const navigate = useNavigate()
  const { user, accessToken } = useAuth()
  const [properties, setProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken) return

    const loadProperties = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await propertyAPI.getMyProperties(accessToken, 1, 20)
        setProperties(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load properties')
      } finally {
        setIsLoading(false)
      }
    }

    loadProperties()
  }, [accessToken])

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <h1 className="text-2xl font-bold text-gray-900">Realty</h1>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">{user?.firstName}</span>
                <button
                  onClick={() => navigate('/properties/create')}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  List Property
                </button>
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">My Properties</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12">
              <div className="text-gray-600">Loading properties...</div>
            </div>
          ) : properties.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No properties listed yet</h3>
              <p className="text-gray-600 mb-4">Start listing your properties to reach more buyers</p>
              <button
                onClick={() => navigate('/properties/create')}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                List Your First Property
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((property) => (
                <PropertyCard key={property.id} {...property} />
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
