import { useState } from 'react'

export interface SearchFilters {
  city?: string
  region?: string
  type?: string
  priceMin?: number
  priceMax?: number
  bedroomsMin?: number
  bedroomsMax?: number
  bathroomsMin?: number
  bathroomsMax?: number
  areaMin?: number
  areaMax?: number
}

interface SearchFiltersProps {
  onSearch: (filters: SearchFilters) => void
  isLoading?: boolean
}

export const SearchFiltersComponent = ({ onSearch, isLoading = false }: SearchFiltersProps) => {
  const [filters, setFilters] = useState<SearchFilters>({})
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleChange = (field: keyof SearchFilters, value: string | number | undefined) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value === '' ? undefined : value,
    }))
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(filters)
  }

  const handleReset = () => {
    setFilters({})
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <form onSubmit={handleSearch} className="space-y-4">
        {/* Basic Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
            <input
              type="text"
              value={filters.city || ''}
              onChange={(e) => handleChange('city', e.target.value)}
              placeholder="Ej: Madrid"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Región</label>
            <input
              type="text"
              value={filters.region || ''}
              onChange={(e) => handleChange('region', e.target.value)}
              placeholder="Ej: Madrid"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={filters.type || ''}
              onChange={(e) => handleChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              <option value="RESIDENTIAL">Residencial</option>
              <option value="COMMERCIAL">Comercial</option>
              <option value="LAND">Terreno</option>
              <option value="OFFICE">Oficina</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Precio Mín</label>
            <input
              type="number"
              value={filters.priceMin || ''}
              onChange={(e) => handleChange('priceMin', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio Máx</label>
                <input
                  type="number"
                  value={filters.priceMax || ''}
                  onChange={(e) => handleChange('priceMax', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="999999"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hab Mín</label>
                <input
                  type="number"
                  value={filters.bedroomsMin || ''}
                  onChange={(e) =>
                    handleChange('bedroomsMin', e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hab Máx</label>
                <input
                  type="number"
                  value={filters.bedroomsMax || ''}
                  onChange={(e) =>
                    handleChange('bedroomsMax', e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  placeholder="10"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Baños Mín</label>
                <input
                  type="number"
                  value={filters.bathroomsMin || ''}
                  onChange={(e) =>
                    handleChange('bathroomsMin', e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Baños Máx</label>
                <input
                  type="number"
                  value={filters.bathroomsMax || ''}
                  onChange={(e) =>
                    handleChange('bathroomsMax', e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  placeholder="10"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Área Mín (m²)</label>
                <input
                  type="number"
                  value={filters.areaMin || ''}
                  onChange={(e) =>
                    handleChange('areaMin', e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Área Máx (m²)</label>
                <input
                  type="number"
                  value={filters.areaMax || ''}
                  onChange={(e) =>
                    handleChange('areaMax', e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  placeholder="9999"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {isLoading ? 'Buscando...' : 'Buscar'}
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
          >
            Limpiar
          </button>

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm"
          >
            {showAdvanced ? 'Menos ▲' : 'Más ▼'}
          </button>
        </div>
      </form>
    </div>
  )
}
