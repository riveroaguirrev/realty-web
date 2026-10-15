import { lazy, Suspense } from 'react'
import type { LocationAddress } from '@/utils/mapboxAddress'
import type { LocationValue } from './MapboxPropertyLocationMap'

const MapboxPropertyLocationMap = lazy(() => import('./MapboxPropertyLocationMap'))

export function PropertyLocationMap(props: {
  value: LocationValue
  onChange?: (coordinates: { latitude: number; longitude: number }) => void
  onAddressChange?: (details: LocationAddress, baseline: LocationAddress) => void
  onRadiusChange?: (meters: number) => void
  address?: string
  neighborhood?: string
  city?: string
}) {
  return <Suspense fallback={<p role="status">Cargando mapa…</p>}><MapboxPropertyLocationMap {...props} /></Suspense>
}
