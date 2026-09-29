import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { SearchFiltersComponent, SearchFilters } from '@/components/property/SearchFilters'
import { propertySearchAPI } from '@/services/propertySearch'
import { PropertyCard } from '@/components/property/PropertyCard'

export const PropertySearch = () => {
  const navigate = useNavigate()
  const { accessToken } = useAuth()

  const [results, setResults] = useState<any[]>([])
  const [pagination, setPagination] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchDone, setSearchDone] = useState(false)

  const handleSearch = async (filters: SearchFilters) => {
    if (!accessToken) return

    try {
      setIsLoading(true)
      setError(null)
      const result = await propertySearchAPI.search(accessToken, filters)
      setResults(result.properties)
      setPagination(result.pagination)
      setSearchDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const handlePageChange = async (filters: SearchFilters, newPage: number) => {
    if (!accessToken) return

    try {
      setIsLoading(true)
      const result = await propertySearchAPI.search(accessToken, {
        ...filters,
        page: newPage,
      })
      setResults(result.properties)
      setPagination(result.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load page')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
        <nav className="bg-white shadow-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  Realty
                </h1>
              </div>
              <div className="flex gap-6">
                <button
                  onClick={() => navigate('/favorites')}
                  className="px-4 py-2 text-gray-700 hover:text-blue-600 font-semibold transition-colors"
                >
                  ❤️ Favoritos
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
          {/* Search Filters */}
          <SearchFiltersComponent onSearch={handleSearch} isLoading={isLoading} />

          {/* Error Message */}
          {error && (
            <div className="mb-8 bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-r-lg shadow-sm">
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* No Search Yet */}
          {!searchDone && (
            <div className="bg-white rounded-xl shadow-lg p-16 text-center">
              <div className="mb-6">
                <div className="text-6xl mb-4">🔍</div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Comienza tu búsqueda</h3>
              <p className="text-gray-600 text-lg">Usa los filtros arriba para descubrir propiedades increíbles</p>
            </div>
          )}

          {/* Results */}
          {searchDone && (
            <div>
              <div className="mb-8">
                <h2 className="text-4xl font-bold text-gray-900">
                  Resultados
                  <span className="ml-3 text-2xl text-blue-600 font-semibold">
                    ({pagination?.total || 0})
                  </span>
                </h2>
              </div>

              {results.length === 0 ? (
                <div className="bg-white rounded-xl shadow-lg p-16 text-center">
                  <div className="text-6xl mb-4">🏠</div>
                  <p className="text-gray-600 text-lg">No encontramos propiedades que coincidan con tu búsqueda</p>
                  <p className="text-gray-500 text-sm mt-2">Intenta ajustar los filtros</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                    {results.map((property) => (
                      <div
                        key={property.id}
                        onClick={() => navigate(`/properties/${property.id}`)}
                        className="cursor-pointer transform transition-all hover:scale-105"
                      >
                        <PropertyCard {...property} />
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {pagination && pagination.totalPages > 1 && (
                    <div className="flex justify-center gap-2 py-8">
                      {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => handlePageChange({}, page)}
                          disabled={isLoading}
                          className={`px-4 py-2 rounded-lg font-medium transition-all ${
                            page === pagination.page
                              ? 'bg-blue-600 text-white shadow-md'
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
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
