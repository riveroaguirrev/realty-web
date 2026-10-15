import { useEffect, useRef, useState } from 'react'
import mapboxgl, { GeoJSONSource } from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { mapboxAddress, type LocationAddress, type MapboxReverseFeature, type MapboxPlace as Place } from '@/utils/mapboxAddress'

export interface LocationValue {
  latitude: number | null
  longitude: number | null
  locationMode: 'EXACT' | 'RADIUS'
  locationRadiusMeters: number
}
interface Props {
  value: LocationValue
  onChange?: (coordinates: { latitude: number; longitude: number }) => void
  onAddressChange?: (details: LocationAddress, baseline: LocationAddress) => void
  onRadiusChange?: (meters: number) => void
  address?: string
  neighborhood?: string
  city?: string
}

// Geographic distances in meters, independent of map zoom or screen size.
export function radiusPolygon(longitude: number, latitude: number, meters: number): GeoJSON.Feature<GeoJSON.Polygon> {
  const angular = meters / 6371008.8
  const lat = latitude * Math.PI / 180
  const lng = longitude * Math.PI / 180
  const coordinates: number[][] = []
  for (let i = 0; i <= 80; i++) {
    const bearing = (i % 80) / 80 * Math.PI * 2
    const y = Math.asin(Math.sin(lat) * Math.cos(angular) + Math.cos(lat) * Math.sin(angular) * Math.cos(bearing))
    const x = lng + Math.atan2(Math.sin(bearing) * Math.sin(angular) * Math.cos(lat), Math.cos(angular) - Math.sin(lat) * Math.sin(y))
    coordinates.push([x * 180 / Math.PI, y * 180 / Math.PI])
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coordinates] } }
}

export default function MapboxPropertyLocationMap({ value, onChange, onAddressChange, onRadiusChange, city = '', address = '', neighborhood = '' }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const current = useRef({ value, onChange, onAddressChange, address, city, neighborhood })
  current.current = { value, onChange, onAddressChange, address, city, neighborhood }
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN
  const [loaded, setLoaded] = useState(false)
  const [mapError, setMapError] = useState('')
  const [search, setSearch] = useState('')
  const [places, setPlaces] = useState<Place[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [expanded, setExpanded] = useState(false)
  const expandButton = useRef<HTMLButtonElement>(null)
  const [locating, setLocating] = useState(false)
  const [locationMessage, setLocationMessage] = useState('')
  const formQuery = [address.trim(), neighborhood.trim(), city.trim()].filter(Boolean).join(', ')
  const lastFormQuery = useRef(value.latitude != null && value.longitude != null ? formQuery : '')
  const manualSelection = useRef(0)
  const reverseRequest = useRef<AbortController | null>(null)
  const mapPanel = useRef<HTMLDivElement>(null)

  useEffect(() => () => reverseRequest.current?.abort(), [])

  const selectPoint = async (coordinates: { longitude: number; latitude: number }, knownAddress?: LocationAddress) => {
    manualSelection.current++
    reverseRequest.current?.abort()
    const baseline = { address: current.current.address, city: current.current.city, neighborhood: current.current.neighborhood }
    current.current.onChange?.(coordinates)
    if (!token || !current.current.onAddressChange) return
    const controller = new AbortController()
    reverseRequest.current = controller
    setLocating(true)
    setLocationMessage('')
    try {
      const params = new URLSearchParams({ access_token: token, language: 'es', country: 'bo', longitude: String(coordinates.longitude), latitude: String(coordinates.latitude) })
      let details: LocationAddress = { address: '', neighborhood: '', city: '' }
      let succeeded = false
      try {
        const response = await fetch(`https://api.mapbox.com/search/geocode/v6/reverse?${params}`, { signal: controller.signal })
        if (response.ok) {
          const data = await response.json() as { features: MapboxReverseFeature[] }
          details = mapboxAddress(data.features)
          succeeded = true
        }
      } catch { if (controller.signal.aborted) return }
      if (!details.neighborhood && !controller.signal.aborted) {
        const fallbackParams = new URLSearchParams({ access_token: token, language: 'es', country: 'bo' })
        try {
          const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${coordinates.longitude},${coordinates.latitude}.json?${fallbackParams}`, { signal: controller.signal })
          if (response.ok) {
            const data = await response.json() as { features: MapboxReverseFeature[] }
            const fallback = mapboxAddress(data.features)
            details = { address: details.address || fallback.address, neighborhood: details.neighborhood || fallback.neighborhood, city: details.city || fallback.city }
            succeeded = true
          }
        } catch { if (controller.signal.aborted) return }
      }
      if (controller.signal.aborted) return
      if (!succeeded) throw new Error()
      details = { address: details.address || knownAddress?.address || '', neighborhood: details.neighborhood || knownAddress?.neighborhood || '', city: details.city || knownAddress?.city || '' }
      current.current.onAddressChange?.(details, baseline)
    } catch {
      if (!controller.signal.aborted) setLocationMessage('El punto quedó seleccionado, pero no pudimos completar la dirección. Puedes ingresar los datos debajo.')
    } finally { if (!controller.signal.aborted) setLocating(false) }
  }
  const selectPointRef = useRef(selectPoint)
  selectPointRef.current = selectPoint

  useEffect(() => {
    if (!expanded) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        const controls = Array.from(mapPanel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]') ?? []).filter(element => element.getClientRects().length)
        const first = controls[0], last = controls[controls.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }
      if (event.key === 'Escape') { setExpanded(false); expandButton.current?.focus() }
    }
    window.addEventListener('keydown', handleEscape)
    expandButton.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleEscape)
    }
  }, [expanded])

  useEffect(() => {
    if (!token || !loaded || !onChange || current.current.value.latitude != null || formQuery === lastFormQuery.current) return
    setLocationMessage('')
    setLocating(false)
    if (formQuery.length < 3) return
    const controller = new AbortController()
    const selectionVersion = manualSelection.current
    const timer = window.setTimeout(async () => {
      setLocating(true)
      try {
        const params = new URLSearchParams({ access_token: token, language: 'es', country: 'bo', limit: '1', autocomplete: 'false' })
        if (!address.trim() && !neighborhood.trim()) params.set('types', 'place,locality')
        const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(formQuery)}.json?${params}`, { signal: controller.signal })
        if (!response.ok) throw new Error()
        const data = await response.json() as { features: Place[] }
        if (controller.signal.aborted || manualSelection.current !== selectionVersion || current.current.value.latitude != null) return
        lastFormQuery.current = formQuery
        const place = data.features[0]
        if (!place) {
          setLocationMessage('No encontramos ese lugar. Completa la dirección y la ciudad o selecciona el punto en el mapa.')
          return
        }
        const cityOnly = !address.trim() && !neighborhood.trim()
        const broadResult = place.place_type?.some(type => ['country', 'region', 'place', 'locality', 'district'].includes(type))
        if (cityOnly || broadResult) {
          mapRef.current?.flyTo({ center: place.center, zoom: 12 })
          setLocationMessage(`Encontramos: ${place.place_name}. Completa la dirección o elige el punto del inmueble en el mapa.`)
        } else {
          current.current.onChange?.({ longitude: place.center[0], latitude: place.center[1] })
          mapRef.current?.flyTo({ center: place.center, zoom: 16 })
          setLocationMessage(`Ubicación encontrada: ${place.place_name}. Revisa el punto y ajústalo en el mapa si hace falta.`)
        }
      } catch {
        if (!controller.signal.aborted && manualSelection.current === selectionVersion) setLocationMessage('No pudimos buscar la ubicación. Inténtalo de nuevo o selecciona el punto en el mapa.')
      } finally { if (!controller.signal.aborted) setLocating(false) }
    }, 650)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [token, loaded, formQuery, address, neighborhood, Boolean(onChange)])


  useEffect(() => {
    if (!token || !container.current) return
    let map: mapboxgl.Map
    try {
      const v = current.current.value
      map = new mapboxgl.Map({ container: container.current, accessToken: token, cooperativeGestures: true,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [v.longitude ?? -66.157, v.latitude ?? -17.3935], zoom: v.latitude == null ? 12 : v.locationMode === 'EXACT' ? 16 : 13 })
    } catch {
      setMapError('No pudimos abrir el mapa. Comprueba que tu navegador permita WebGL.')
      return
    }
    mapRef.current = map
    map.addControl(new mapboxgl.NavigationControl(), 'top-right')
    map.on('load', () => {
      map.addSource('location-zone', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({ id: 'location-zone-fill', type: 'fill', source: 'location-zone', paint: { 'fill-color': '#244e7c', 'fill-opacity': 0.22 } })
      map.addLayer({ id: 'location-zone-line', type: 'line', source: 'location-zone', paint: { 'line-color': '#14243b', 'line-width': 3 } })
      setLoaded(true)
      setMapError('')
    })
    map.on('error', () => setMapError('No se pudo cargar parte del mapa. Revisa la conexión o el acceso a Mapbox.'))
    map.on('click', e => {
      if (Math.abs(e.lngLat.lat) <= 85) {
        void selectPointRef.current({ longitude: e.lngLat.wrap().lng, latitude: e.lngLat.lat })
      }
    })
    map.on('moveend', () => {
      const v = current.current.value
      if (v.locationMode !== 'RADIUS' || v.latitude != null || !current.current.onChange) return
      const center = map.getCenter()
      const source = map.getSource('location-zone') as GeoJSONSource | undefined
      source?.setData(radiusPolygon(center.lng, center.lat, v.locationRadiusMeters))
    })
    const resize = new ResizeObserver(() => map.resize())
    resize.observe(container.current)
    return () => { resize.disconnect(); markerRef.current?.remove(); markerRef.current = null; map.remove(); mapRef.current = null; setLoaded(false) }
  }, [token])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !loaded) return
    markerRef.current?.remove()
    markerRef.current = null
    const source = map.getSource('location-zone') as GeoJSONSource | undefined
    if (!source) return
    const hasLocation = value.latitude != null && value.longitude != null
    const center = map.getCenter()
    const longitude = value.longitude ?? center.lng
    const latitude = value.latitude ?? center.lat
    source.setData(value.locationMode === 'RADIUS' && (hasLocation || Boolean(onChange))
      ? radiusPolygon(longitude, latitude, value.locationRadiusMeters)
      : { type: 'FeatureCollection', features: [] })
    if (!hasLocation && (value.locationMode === 'EXACT' || !onChange)) return
    if (hasLocation && value.locationMode === 'EXACT') {
      const marker = new mapboxgl.Marker({ color: '#14243b', draggable: Boolean(onChange) })
        .setLngLat([value.longitude!, value.latitude!]).addTo(map)
      marker.on('dragend', () => {
        const point = marker.getLngLat().wrap()
        void selectPointRef.current({ latitude: Math.max(-85, Math.min(85, point.lat)), longitude: point.lng })
      })
      markerRef.current = marker
    }
    if (value.locationMode === 'RADIUS') {
      const deltaLat = value.locationRadiusMeters / 111000
      const deltaLng = deltaLat / Math.cos(latitude * Math.PI / 180)
      map.fitBounds([[longitude - deltaLng, latitude - deltaLat], [longitude + deltaLng, latitude + deltaLat]], { padding: 50, maxZoom: 16, duration: 350 })
    }
  }, [loaded, value.latitude, value.longitude, value.locationMode, value.locationRadiusMeters, Boolean(onChange)])

  useEffect(() => {
    setPlaces([])
    setSearching(false)
    setSearchError('')
    if (!token || !onChange || search.trim().length < 3) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setSearching(true)
      try {
        const params = new URLSearchParams({ access_token: token, language: 'es', country: 'bo', limit: '5' })
        const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent([search.trim(), city].filter(Boolean).join(', '))}.json?${params}`, { signal: controller.signal })
        if (!res.ok) throw new Error()
        const data = await res.json() as { features: Place[] }
        if (!controller.signal.aborted) {
          setPlaces(data.features)
          if (!data.features.length) setSearchError('No encontramos resultados. Prueba otra dirección o selecciona en el mapa.')
        }
      } catch {
        if (!controller.signal.aborted) setSearchError('No pudimos buscar la dirección. Puedes elegir directamente en el mapa.')
      } finally { if (!controller.signal.aborted) setSearching(false) }
    }, 350)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [token, search, city, Boolean(onChange)])

  if (!token) return <p role="status" className="form-error">El mapa no está disponible. Falta configurar el acceso a Mapbox.</p>
  return <div ref={mapPanel} className={`property-location-map${expanded ? ' is-expanded' : ''}`} role={expanded ? 'dialog' : undefined} aria-modal={expanded ? true : undefined} aria-label={expanded ? 'Mapa de la propiedad ampliado' : undefined}>

    {onChange && (locating || locationMessage) && <p className="map-geocoding-status" role="status">{locating ? 'Buscando ubicación en Mapbox…' : locationMessage}</p>}
    {onChange && <div className="map-search">
      <label htmlFor="map-search">Buscar dirección o zona</label>
      <input id="map-search" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); if (e.key === 'Escape') setSearch('') }} placeholder="Ej. Cala Cala, Cochabamba" autoComplete="off" />
      {searching && <p role="status">Buscando lugares…</p>}
      {searchError && <p role="status">{searchError}</p>}
      {places.length > 0 && <ul className="map-search-results" aria-label="Lugares encontrados">{places.map(place => <li key={place.id}><button type="button" onClick={() => {
        void selectPoint({ longitude: place.center[0], latitude: place.center[1] }, mapboxAddress([place]))
        mapRef.current?.flyTo({ center: place.center, zoom: 15 })
        setSearch('')
      }}>{place.place_name}</button></li>)}</ul>}
    </div>}
    {mapError && <p role="status" className="form-error">{mapError}</p>}
    {onChange && <div className="map-selection-notice">
      <span className="map-selection-notice-icon" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg></span>
      <div><strong>Selecciona el punto en el mapa para completar la ubicación.</strong><p>{value.locationMode === 'RADIUS' ? 'Haz clic para elegir el centro de la zona. Después puedes corregir los datos sin mover el círculo.' : 'Haz clic en el lugar del inmueble. Después puedes corregir los datos sin mover el marcador.'}</p></div>
    </div>}
    <div className="map-frame">
      <div ref={container} className="map-canvas" role="region" aria-label={value.locationMode === 'EXACT' ? 'Mapa con ubicación exacta' : 'Mapa de zona aproximada'} />
      {value.locationMode === 'RADIUS' && <span className="map-radius-badge">Radio: {value.locationRadiusMeters} m</span>}
    </div>
    <div className="map-bottom-controls">
            {value.locationMode === 'RADIUS' && onRadiusChange && <div className="radius-field">
              <div className="radius-label-row"><label htmlFor="location-radius" className="property-label">Radio de la zona</label><output htmlFor="location-radius">{value.locationRadiusMeters.toLocaleString('es-BO')} m</output></div>
              <div className="radius-slider-wrap">
                <input id="location-radius" className="radius-slider" type="range" min="100" max="1000" step="1" value={value.locationRadiusMeters} aria-valuetext={`${value.locationRadiusMeters} metros`} onChange={e => onRadiusChange(Number(e.target.value))} style={{ background: `linear-gradient(to right, #14243b ${(value.locationRadiusMeters - 100) / 9}%, #dce2e9 ${(value.locationRadiusMeters - 100) / 9}%)` }} />
              </div>
              <div className="radius-scale" aria-hidden="true"><span>100 m</span><span>1.000 m</span></div>
            </div>}

    <div className="map-toolbar"><button ref={expandButton} type="button" className="button button-secondary map-expand-button" aria-expanded={expanded} onClick={() => setExpanded(previous => !previous)}>
      <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{expanded ? <path d="m6 6 12 12M6 18 18 6" /> : <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />}</svg>
      {expanded ? 'Cerrar mapa ampliado' : 'Ampliar mapa'}
    </button></div>
    </div>
    {!onChange && <p className="map-hint">{value.locationMode === 'EXACT' ? 'Ubicación exacta publicada por el asesor.' : `Ubicación aproximada · Radio de ${value.locationRadiusMeters} m. El inmueble se encuentra dentro de esta zona.`}</p>}
  </div>
}
