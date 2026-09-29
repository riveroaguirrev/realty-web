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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50 to-slate-100">
        <nav className="bg-white shadow-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                Realty
              </h1>
              <div className="flex gap-6">
                <button
                  onClick={() => navigate('/search')}
                  className="px-4 py-2 text-gray-700 hover:text-blue-600 font-semibold transition-colors"
                >
                  🔍 Búsqueda
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-4 py-2 text-gray-700 hover:text-blue-600 font-semibold transition-colors"
                >
                  ← Dashboard
                </button>
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">❤️ Propiedades Favoritas</h1>
            <p className="text-gray-600">Tus propiedades guardadas</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {properties.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-16 text-center">
              <div className="mb-6">
                <div className="text-7xl mb-4">💔</div>
              </div>
              <p className="text-gray-600 text-xl mb-2">Sin propiedades favoritas aún</p>
              <p className="text-gray-500 text-sm mb-6">Comienza a guardar propiedades que te gusten</p>
              <button
                onClick={() => navigate('/search')}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-shadow"
              >
                🔍 Explorar Propiedades
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                {properties.map((property) => (
                  <div
                    key={property.id}
                    className="relative cursor-pointer transform transition-all hover:scale-105"
                    onClick={() => navigate(`/properties/${property.id}`)}
                  >
                    <PropertyCard {...property} />
                    <button
                      onClick={(e) => handleRemoveFavorite(property.id, e)}
                      disabled={removingId === property.id}
                      className="absolute top-3 right-3 bg-red-500 text-white p-3 rounded-full hover:bg-red-600 disabled:opacity-50 z-10 shadow-lg transition-all hover:scale-110"
                      title="Remover de favoritos"
                    >
                      ❤
                    </button>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex justify-center gap-2 py-8">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      disabled={isLoading}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        page === pagination.page
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                          : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-400 hover:text-blue-600'
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
