import axios from 'axios'
import type { SearchFilters } from '@/components/property/SearchFilters'
import type { MapProperty } from '@/utils/propertyMap'

export async function searchMapProperties(token: string, filters: SearchFilters, signal?: AbortSignal) {
  const { data } = await axios.get<{
    success: boolean; data: MapProperty[]; meta: { total: number; locatedTotal: number; limit: number }
  }>(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/properties/search`, {
    headers: { Authorization: `Bearer ${token}` }, params: { ...filters, view: 'map' }, signal,
  })
  if (!data.success) throw new Error('No se pudieron cargar las propiedades')
  return { properties: data.data, ...data.meta }
}
