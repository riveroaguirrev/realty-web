import type { MapboxPlace } from './mapboxAddress'

export interface SearchBounds { west: number; south: number; east: number; north: number }

export function validSearchBounds(value: Partial<SearchBounds>): value is SearchBounds {
  return [value.west, value.south, value.east, value.north].every(n => typeof n === 'number' && Number.isFinite(n)) &&
    value.west! >= -180 && value.east! <= 180 && value.south! >= -85 && value.north! <= 85 &&
    value.west! < value.east! && value.south! < value.north!
}

export function boundsForPlace(place: MapboxPlace): SearchBounds {
  if (place.bbox) {
    const [west, south, east, north] = place.bbox
    const bounds = { west, south, east, north }
    if (validSearchBounds(bounds)) return bounds
  }
  // Some neighborhoods have only a center. Search a 2 km area around it.
  const [longitude, latitude] = place.center
  const distance = place.place_type?.includes('place') ? 8000 : 2000
  const latDelta = distance / 111320
  const lngDelta = latDelta / Math.cos(latitude * Math.PI / 180)
  return { west: longitude - lngDelta, south: latitude - latDelta, east: longitude + lngDelta, north: latitude + latDelta }
}
