import { useEffect, useState } from 'react'
import { matchingAPI, PropertyMatch } from '@/services/matching'
import { PropertyCard } from './PropertyCard'

interface SimilarPropertiesProps {
  propertyId: string
}

export const SimilarProperties = ({ propertyId }: SimilarPropertiesProps) => {
  const [matches, setMatches] = useState<PropertyMatch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadSimilarProperties = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await matchingAPI.getSimilarProperties(propertyId, 6)
        setMatches(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No pudimos cargar propiedades similares.')
      } finally {
        setIsLoading(false)
      }
    }

    loadSimilarProperties()
  }, [propertyId])

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Buscando propiedades similares...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-r-lg">
        <p className="font-semibold">Error</p>
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  if (matches.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <p className="text-gray-600 text-lg">No hay propiedades similares disponibles</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">También te puede interesar</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {matches.map((match) => (
          <div
            key={match.propertyId}
            className="cursor-pointer transform transition-all hover:scale-105"
          >
            <div className="relative">
              <PropertyCard {...match.property} />
              {/* Match score badge */}
              <div className="absolute top-3 left-3 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                {Math.round(match.score)}%
              </div>
              {/* Match reason tooltip */}
              <div className="mt-2 text-xs text-gray-600">
                <p className="font-semibold text-gray-700">Coincidencias:</p>
                <p>{match.matchReason}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
