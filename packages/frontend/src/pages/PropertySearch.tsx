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
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <h1 className="text-2xl font-bold text-gray-900">Realty</h1>
              <div className="flex gap-4">
                <button
                  onClick={() => navigate('/favorites')}
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  Favoritos
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
          {/* Search Filters */}
          <SearchFiltersComponent onSearch={handleSearch} isLoading={isLoading} />

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* No Search Yet */}
          {!searchDone && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-600 text-lg">Usa los filtros arriba para buscar propiedades</p>
            </div>
          )}

          {/* Results */}
          {searchDone && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Resultados ({pagination?.total || 0})
              </h2>

              {results.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <p className="text-gray-600 text-lg">No se encontraron propiedades</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {results.map((property) => (
                      <div
                        key={property.id}
                        onClick={() => navigate(`/properties/${property.id}`)}
                        className="cursor-pointer"
                      >
                        <PropertyCard property={property} />
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {pagination && pagination.totalPages > 1 && (
                    <div className="flex justify-center gap-2">
                      {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => handlePageChange({}, page)}
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
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
