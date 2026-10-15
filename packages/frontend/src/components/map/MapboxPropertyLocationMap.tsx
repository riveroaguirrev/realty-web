import { useEffect, useRef, useState } from 'react'
import mapboxgl, { GeoJSONSource } from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

export interface LocationValue {
  latitude: number | null
  longitude: number | null
  locationMode: 'EXACT' | 'RADIUS'
  locationRadiusMeters: number
}
interface Props {
  value: LocationValue
  onChange?: (coordinates: { latitude: number; longitude: number }) => void
  city?: string
}
interface Place { id: string; place_name: string; center: [number, number] }

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

export default function MapboxPropertyLocationMap({ value, onChange, city = '' }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const current = useRef({ value, onChange })
  current.current = { value, onChange }
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN
  const [loaded, setLoaded] = useState(false)
  const [mapError, setMapError] = useState('')
  const [search, setSearch] = useState('')
  const [places, setPlaces] = useState<Place[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

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
      if (Math.abs(e.lngLat.lat) <= 85) current.current.onChange?.({ longitude: e.lngLat.wrap().lng, latitude: e.lngLat.lat })
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
    if (value.locationMode === 'EXACT') {
      const marker = new mapboxgl.Marker({ color: '#14243b', draggable: Boolean(onChange) })
        .setLngLat([value.longitude!, value.latitude!]).addTo(map)
      marker.on('dragend', () => {
        const point = marker.getLngLat().wrap()
        current.current.onChange?.({ latitude: Math.max(-85, Math.min(85, point.lat)), longitude: point.lng })
      })
      markerRef.current = marker
    } else {
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
  return <div className="property-location-map">
    {onChange && <div className="map-search">
      <label htmlFor="map-search">Buscar dirección o zona</label>
      <input id="map-search" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); if (e.key === 'Escape') setSearch('') }} placeholder="Ej. Cala Cala, Cochabamba" autoComplete="off" />
      {searching && <p role="status">Buscando lugares…</p>}
      {searchError && <p role="status">{searchError}</p>}
      {places.length > 0 && <ul className="map-search-results" aria-label="Lugares encontrados">{places.map(place => <li key={place.id}><button type="button" onClick={() => {
        onChange({ longitude: place.center[0], latitude: place.center[1] })
        mapRef.current?.flyTo({ center: place.center, zoom: 15 })
        setSearch('')
      }}>{place.place_name}</button></li>)}</ul>}
    </div>}
    {mapError && <p role="status" className="form-error">{mapError}</p>}
    <div className="map-frame">
      <div ref={container} className="map-canvas" role="region" aria-label={value.locationMode === 'EXACT' ? 'Mapa con ubicación exacta' : 'Mapa de zona aproximada'} />
      {value.locationMode === 'RADIUS' && <span className="map-radius-badge">Radio: {value.locationRadiusMeters} m</span>}
    </div>
    {onChange && value.locationMode === 'RADIUS' && <button type="button" className="button button-secondary mt-3" disabled={!loaded} onClick={() => {
      const center = mapRef.current?.getCenter().wrap()
      if (center) onChange({ latitude: center.lat, longitude: center.lng })
    }}>Usar el centro visible para esta zona</button>}
    <p className="map-hint">{onChange ? value.locationMode === 'EXACT' ? 'Haz clic o arrastra el marcador para indicar la ubicación exacta.' : 'Haz clic para elegir el centro de una zona que contenga el inmueble. Se publicará solo el círculo, sin marcador.' : value.locationMode === 'EXACT' ? 'Ubicación exacta publicada por el asesor.' : `Ubicación aproximada · Radio de ${value.locationRadiusMeters} m. El inmueble se encuentra dentro de esta zona.`}</p>
    {onChange && <p className="map-hint">{value.latitude == null ? value.locationMode === 'RADIUS' ? 'Vista previa: mueve el mapa y confirma la zona o haz clic para seleccionarla.' : 'Todavía no seleccionaste una ubicación.' : value.locationMode === 'EXACT' ? 'Marcador seleccionado.' : 'Zona seleccionada. El centro representa el área, no la dirección del inmueble.'}</p>}
  </div>
}
