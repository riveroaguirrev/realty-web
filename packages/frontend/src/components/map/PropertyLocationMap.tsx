import { lazy, Suspense } from 'react'
import type { LocationValue } from './MapboxPropertyLocationMap'

const MapboxPropertyLocationMap = lazy(() => import('./MapboxPropertyLocationMap'))

export function PropertyLocationMap(props: {
  value: LocationValue
  onChange?: (coordinates: { latitude: number; longitude: number }) => void
  city?: string
}) {
  return <Suspense fallback={<p role="status">Cargando mapa…</p>}><MapboxPropertyLocationMap {...props} /></Suspense>
}
