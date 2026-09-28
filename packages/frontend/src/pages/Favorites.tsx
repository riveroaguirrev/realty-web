import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { favoritesAPI } from '@/services/favorites'
import { PropertyCard } from '@/components/property/PropertyCard'

export const Favorites = () => {
  const navigate = useNavigate()
  const { accessToken } = useAuth()

  const [properties, setProperties] = useState<any[]>([])
  const [pagination, setPagination] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken) return
    loadFavorites()
  }, [accessToken])

  const loadFavorites = async (page = 1) => {
    if (!accessToken) return

    try {
      setIsLoading(true)
      setError(null)
      const result = await favoritesAPI.list(accessToken, page, 12)
      setProperties(result.properties)
      setPagination(result.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load favorites')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveFavorite = async (propertyId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!accessToken) return

    try {
      setRemovingId(propertyId)
      await favoritesAPI.remove(accessToken, propertyId)
      setProperties(properties.filter((p) => p.id !== propertyId))
    } catch (err) {
      console.error('Error removing favorite:', err)
    } finally {
      setRemovingId(null)
    }
  }

  const handlePageChange = (newPage: number) => {
    loadFavorites(newPage)
  }

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Cargando favoritos...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <h1 className="text-2xl font-bold text-gray-900">Realty</h1>
              <div className="flex gap-4">
                <button
                  onClick={() => navigate('/search')}
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  Búsqueda
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="text-gray-600 hover:text-gray-900"
                >
                  ← Dashboard
                </button>
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Propiedades Favoritas</h1>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {properties.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-600 text-lg mb-4">No tienes propiedades favoritas aún</p>
              <button
                onClick={() => navigate('/search')}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
              >
                Ir a Búsqueda
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {properties.map((property) => (
                  <div
                    key={property.id}
                    className="relative cursor-pointer"
                    onClick={() => navigate(`/properties/${property.id}`)}
                  >
                    <PropertyCard property={property} />
                    <button
                      onClick={(e) => handleRemoveFavorite(property.id, e)}
                      disabled={removingId === property.id}
                      className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full hover:bg-red-700 disabled:opacity-50 z-10"
                      title="Remover de favoritos"
                    >
                      ❤
                    </button>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex justify-center gap-2">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      disabled={isLoading}
                      className={`px-4 py-2 rounded ${
                        page === pagination.page
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      } disabled:opacity-50`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
