import { useEffect, useRef, useState } from 'react'
import mapboxgl, { type GeoJSONSource } from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { mapFeatureCollection, type MapBounds, type MapProperty } from '@/utils/propertyMap'
import { radiusPolygon } from '@/utils/mapGeometry'

interface Props {
  properties: MapProperty[]
  searchBounds: MapBounds | null
  selected: MapProperty | null
  onSelect: (id: string) => void
  onBounds: (bounds: MapBounds) => void
}
const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

export default function DiscoveryMap({ properties, searchBounds, selected, onSelect, onBounds }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const latest = useRef({ onSelect, onBounds })
  latest.current = { onSelect, onBounds }
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined

  useEffect(() => {
    if (!token || !container.current) return
    setReady(false)
    setError('')
    let map: mapboxgl.Map
    try {
      map = new mapboxgl.Map({ container: container.current, accessToken: token, style: 'mapbox://styles/mapbox/streets-v12', center: [-64.8, -17.2], zoom: 5, minZoom: 3 })
    } catch { setError('Tu navegador no pudo abrir el mapa. Comprueba que WebGL esté habilitado.'); return }
    mapRef.current = map
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
    map.addControl(new mapboxgl.FullscreenControl(), 'top-right')
    const reportBounds = () => {
      const b = map.getBounds()
      if (b) latest.current.onBounds({ west: b.getWest(), east: b.getEast(), south: b.getSouth(), north: b.getNorth() })
    }
    map.on('load', () => {
      map.addSource('properties', { type: 'geojson', data: empty, cluster: true, clusterMaxZoom: 15, clusterRadius: 55 })
      map.addSource('areas', { type: 'geojson', data: empty })
      map.addLayer({ id: 'areas-fill', type: 'fill', source: 'areas', minzoom: 10, paint: { 'fill-color': '#9b765f', 'fill-opacity': 0.12 } })
      map.addLayer({ id: 'areas-line', type: 'line', source: 'areas', minzoom: 10, paint: { 'line-color': '#9b765f', 'line-width': 1.5, 'line-dasharray': [3, 2] } })
      map.addSource('selection', { type: 'geojson', data: empty })
      map.addLayer({ id: 'selection-fill', type: 'fill', source: 'selection', paint: { 'fill-color': '#9b765f', 'fill-opacity': 0.18 } })
      map.addLayer({ id: 'selection-line', type: 'line', source: 'selection', paint: { 'line-color': '#9b765f', 'line-width': 2, 'line-dasharray': [3, 2] } })
      map.addLayer({ id: 'clusters', type: 'circle', source: 'properties', filter: ['has', 'point_count'], paint: { 'circle-color': '#14243b', 'circle-radius': ['step', ['get', 'point_count'], 23, 10, 29, 50, 36], 'circle-stroke-color': '#fff', 'circle-stroke-width': 3 } })
      map.addLayer({ id: 'cluster-count', type: 'symbol', source: 'properties', filter: ['has', 'point_count'], layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 13 }, paint: { 'text-color': '#fff' } })
      map.addLayer({ id: 'points', type: 'circle', source: 'properties', filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'exact'], true]], paint: { 'circle-color': '#9b765f', 'circle-radius': 9, 'circle-stroke-width': 3, 'circle-stroke-color': '#fff' } })
      map.addLayer({ id: 'prices', type: 'symbol', source: 'properties', filter: ['!', ['has', 'point_count']], layout: { 'text-field': ['concat', ['get', 'currency'], ' ', ['get', 'price']], 'text-size': 12, 'text-anchor': 'bottom', 'text-offset': [0, -1.1] }, paint: { 'text-color': '#14243b', 'text-halo-color': '#fff', 'text-halo-width': 2 } })
      map.on('click', 'clusters', event => {
        const feature = event.features?.[0]
        if (!feature || feature.geometry.type !== 'Point') return
        try {
          const center = feature.geometry.coordinates as [number, number]
          ;(map.getSource('properties') as GeoJSONSource).getClusterExpansionZoom(Number(feature.properties?.cluster_id), (error, zoom) => {
            if (!error && zoom != null && mapRef.current === map) map.easeTo({ center, zoom })
          })
        } catch { /* The source may have changed while filters were updated. */ }
      })
      for (const layer of ['points', 'prices', 'areas-fill']) map.on('click', layer, event => {
        const id = event.features?.[0]?.properties?.id
        if (id) latest.current.onSelect(String(id))
      })
      for (const layer of ['points', 'prices', 'clusters', 'areas-fill']) {
        map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = '' })
      }
      setReady(true)
      reportBounds()
    })
    map.on('moveend', reportBounds)
    map.on('error', () => setError('No pudimos cargar parte del mapa. Comprueba tu conexión y vuelve a intentarlo.'))
    const resize = new ResizeObserver(() => map.resize())
    resize.observe(container.current)
    return () => { resize.disconnect(); mapRef.current = null; map.remove(); setReady(false) }
  }, [token, attempt])

  const fit = () => {
    const map = mapRef.current
    if (!map || !properties.length) return
    const bounds = new mapboxgl.LngLatBounds()
    properties.forEach(p => bounds.extend([p.longitude, p.latitude]))
    map.fitBounds(bounds, { padding: 65, maxZoom: 14, duration: 550 })
  }
  useEffect(() => {
    if (!ready) return
    ;(mapRef.current?.getSource('properties') as GeoJSONSource)?.setData(mapFeatureCollection(properties))
    const areas: GeoJSON.FeatureCollection<GeoJSON.Polygon> = { type: 'FeatureCollection', features: properties.filter(p => !(p.isExclusive && p.locationMode === 'EXACT')).map(p => ({ ...radiusPolygon(p.longitude, p.latitude, p.locationRadiusMeters || 500), properties: { id: p.id } })) }
    ;(mapRef.current?.getSource('areas') as GeoJSONSource)?.setData(areas)
    if (searchBounds) mapRef.current?.fitBounds([[searchBounds.west, searchBounds.south], [searchBounds.east, searchBounds.north]], { padding: 65, maxZoom: 15, duration: 550 })
    else fit()
  }, [ready, properties, searchBounds])

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map || !map.getLayer('points') || !map.getSource('selection')) return
    for (const layer of ['areas-fill', 'areas-line']) map.setFilter(layer, ['!=', ['get', 'id'], selected?.id || ''])
    const approximate = selected && !(selected.isExclusive && selected.locationMode === 'EXACT')
    ;(map.getSource('selection') as GeoJSONSource).setData(approximate ? radiusPolygon(selected.longitude, selected.latitude, selected.locationRadiusMeters || 500) : empty)
    map.setPaintProperty('points', 'circle-color', ['case', ['==', ['get', 'id'], selected?.id || ''], '#14243b', '#9b765f'])
    map.setPaintProperty('points', 'circle-radius', ['case', ['==', ['get', 'id'], selected?.id || ''], 13, 9])
    if (selected) map.easeTo({ center: [selected.longitude, selected.latitude], zoom: Math.max(map.getZoom(), 14), duration: 500 })
  }, [ready, selected])

  return <div className="discovery-map">
    <div ref={container} className="discovery-canvas" role="region" aria-label="Mapa interactivo de propiedades. Usa la lista para seleccionar una propiedad." />
    {!token ? <div className="discovery-map-message" role="status"><strong>El mapa aún no está configurado</strong><p>Puedes consultar los resultados en la lista mientras se habilita el mapa.</p></div> : error ? <div className="discovery-map-message" role="alert"><p>{error}</p><button className="button button-secondary" onClick={() => { setReady(false); setAttempt(a => a + 1) }}>Reintentar mapa</button></div> : !ready && <div className="discovery-map-message" role="status">Cargando mapa…</div>}
    <div className="map-legend"><span className="map-legend-dot" />Ubicación exacta<span className="map-legend-cluster">12</span>Agrupación<span className="map-legend-zone" />Zona aproximada</div>
  </div>
}
