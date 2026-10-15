import type { PropertyCardProps } from '@/components/property/PropertyCard'
import type { SearchFilters } from '@/components/property/SearchFilters'

export interface MapProperty extends PropertyCardProps {
  latitude: number
  longitude: number
  isExclusive: boolean
  locationMode: string
  locationRadiusMeters: number
  region: string
}
export interface MapBounds { west: number; east: number; south: number; north: number }

export function readMapFilters(params: URLSearchParams): SearchFilters {
  const filters: SearchFilters = {}
  for (const key of ['city', 'region', 'type', 'operation', 'currency'] as const) {
    const value = params.get(key)?.trim()
    if (value) filters[key] = value
  }
  for (const key of ['priceMin', 'priceMax', 'bedroomsMin', 'bedroomsMax', 'bathroomsMin', 'bathroomsMax', 'areaMin', 'areaMax'] as const) {
    const value = params.get(key)
    if (value?.trim() && Number.isFinite(Number(value)) && Number(value) >= 0) filters[key] = Number(value)
  }
  return filters
}

export function inMapBounds(property: MapProperty, bounds: MapBounds): boolean {
  const longitude = ((property.longitude + 180) % 360 + 360) % 360 - 180
  const west = ((bounds.west + 180) % 360 + 360) % 360 - 180
  const east = ((bounds.east + 180) % 360 + 360) % 360 - 180
  const withinLongitude = bounds.east - bounds.west >= 360 || (west <= east ? longitude >= west && longitude <= east : longitude >= west || longitude <= east)
  return property.latitude >= bounds.south && property.latitude <= bounds.north && withinLongitude
}

export function mapFeatureCollection(properties: MapProperty[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return { type: 'FeatureCollection', features: properties.filter(p => Number.isFinite(p.latitude) && Number.isFinite(p.longitude)).map(p => ({
    type: 'Feature', geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
    properties: { id: p.id, exact: p.isExclusive && p.locationMode === 'EXACT', price: new Intl.NumberFormat('es-BO', { maximumFractionDigits: 0, notation: 'compact' }).format(Number(p.price)), currency: p.currency || 'USD' },
  })) }
}
