import { lazy, Suspense, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { SearchFiltersComponent, type SearchFilters } from '@/components/property/SearchFilters'
import { PropertyCard } from '@/components/property/PropertyCard'
import { Icon } from '@/components/ui/Icon'
import { searchMapProperties } from '@/services/propertyMap'
import { inMapBounds, readMapFilters, type MapBounds, type MapProperty } from '@/utils/propertyMap'
import { formatPrice, PROPERTY_TYPES } from '@/utils/propertyPresentation'
import './PropertyMap.css'

const DiscoveryMap = lazy(() => import('@/components/map/DiscoveryMap'))
const emptyProperties: MapProperty[] = []

export function PropertyMap() {
  const { accessToken } = useAuth()
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => readMapFilters(params), [params])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [bounds, setBounds] = useState<MapBounds | null>(null)
  const [onlyVisible, setOnlyVisible] = useState(false)
  const [listLimit, setListLimit] = useState(30)
  const [showResults, setShowResults] = useState(false)
  const [showFilters, setShowFilters] = useState(true)
  const query = useQuery({
    queryKey: ['property-map', accessToken, filters],
    queryFn: ({ signal }) => searchMapProperties(accessToken!, filters, signal),
    enabled: !!accessToken,
  })
  const properties = query.data?.properties || emptyProperties
  const selected = properties.find(p => p.id === selectedId) || null
  const visible = useMemo(() => onlyVisible && bounds ? properties.filter(p => inMapBounds(p, bounds)) : properties, [properties, onlyVisible, bounds])
  const missing = query.data ? query.data.total - query.data.locatedTotal : 0
  const search = (values: SearchFilters) => {
    const next = new URLSearchParams()
    Object.entries(values).forEach(([key, value]) => { if (value !== undefined && value !== '') next.set(key, String(value)) })
    setSelectedId(null)
    setBounds(null)
    setListLimit(30)
    setParams(next)
  }
  const select = (id: string) => { setSelectedId(id); setShowResults(false) }
  const listParams = new URLSearchParams(params)
  if (filters.type) listParams.set('type', filters.type)
  return <div className={`map-page ${showFilters ? 'filters-open' : ''}`}>
    <div className="map-floating-toolbar">
      <div className="map-toolbar-heading"><div><h1>Mapa de propiedades</h1><p aria-live="polite">{query.isPending ? 'Buscando…' : query.isError ? 'Búsqueda no disponible' : `${query.data?.locatedTotal || 0} ${query.data?.locatedTotal === 1 ? 'propiedad' : 'propiedades'}`}{filters.type ? ` · ${PROPERTY_TYPES[filters.type] || filters.type}` : ' · Todos los inmuebles'}</p></div><div className="map-toolbar-buttons"><button className="button button-secondary" aria-expanded={showResults} aria-controls="map-results-panel" onClick={() => setShowResults(value => !value)}><Icon name="grid" />Resultados</button><button className={`button ${showFilters ? 'button-primary' : 'button-secondary'}`} aria-expanded={showFilters} aria-controls="map-filter-panel" onClick={() => setShowFilters(value => !value)}><Icon name="filter" />Filtros{Object.keys(filters).length > 0 && <span className="map-filter-count">{Object.keys(filters).length}</span>}</button><Link to={`/search?${listParams.toString()}`} className="icon-button" aria-label="Explorar en cuadrícula"><Icon name="arrow" /></Link></div></div>
      {showFilters && <div id="map-filter-panel"><SearchFiltersComponent key={JSON.stringify(filters)} initialFilters={filters} onSearch={search} applySelectsImmediately isLoading={query.isFetching} /></div>}
    </div>
    {query.isError ? <div className="empty-panel" role="alert"><h3>No pudimos cargar las propiedades</h3><p>Revisa tu conexión y vuelve a intentarlo.</p><button className="button button-primary" onClick={() => query.refetch()}>Reintentar</button></div> : <>
      {missing > 0 && <p className="map-notice" role="status">{missing} {missing === 1 ? 'propiedad coincide, pero aún no tiene' : 'propiedades coinciden, pero aún no tienen'} una ubicación en el mapa. <Link className="text-link" to={`/search?${listParams.toString()}`}>Ver todos los resultados</Link></p>}
      {query.data && query.data.locatedTotal > properties.length && <p className="map-notice" role="status">Mostramos las {properties.length.toLocaleString('es-BO')} publicaciones más recientes de {query.data.locatedTotal.toLocaleString('es-BO')}. Usa los filtros para reducir la búsqueda.</p>}
      <div className={`map-workspace ${showResults ? 'results-open' : ''}`} aria-busy={query.isPending}>
        <aside id="map-results-panel" className="map-results" aria-hidden={!showResults} aria-label="Propiedades encontradas">
          <div className="map-results-heading"><div className="map-results-title"><h2>{visible.length} {onlyVisible ? 'en esta zona' : visible.length === 1 ? 'resultado' : 'resultados'}</h2><button className="icon-button" aria-label="Cerrar resultados" onClick={() => setShowResults(false)}><Icon name="close" /></button></div><label className="map-visible-toggle"><input type="checkbox" checked={onlyVisible} disabled={!bounds} onChange={event => { setOnlyVisible(event.target.checked); setListLimit(30) }} />Solo en el área visible</label></div>
          <div className="map-results-scroll">
            {query.isPending ? <div className="map-list-empty" role="status">Buscando tu próximo espacio…</div> : visible.length ? visible.slice(0, listLimit).map(property => <MapResult key={property.id} property={property} selected={selectedId === property.id} onSelect={() => select(property.id)} />) : <div className="map-list-empty"><Icon name="search" width="32" height="32" /><h3>{properties.length ? 'No hay resultados en esta zona' : 'No hay propiedades para mostrar'}</h3><p>{properties.length ? 'Mueve el mapa o desactiva el filtro de área visible.' : 'Prueba otra ciudad, otro tipo o amplía tu presupuesto.'}</p><button className="button button-secondary" onClick={() => properties.length ? setOnlyVisible(false) : search({})}>{properties.length ? 'Ver todos los resultados' : 'Limpiar filtros'}</button></div>}
            {visible.length > listLimit && <button className="button button-secondary map-load-more" onClick={() => setListLimit(limit => limit + 30)}>Mostrar más ({visible.length - listLimit})</button>}
          </div>
        </aside>
        <section className="map-explorer" aria-label="Explorar ubicaciones">
          <Suspense fallback={<div className="loading-panel" role="status">Cargando mapa…</div>}><DiscoveryMap properties={properties} selected={selected} onSelect={select} onBounds={setBounds} /></Suspense>
          {selected && <div className="map-selection" aria-label="Propiedad seleccionada"><button className="icon-button map-selection-close" aria-label="Cerrar propiedad seleccionada" onClick={() => setSelectedId(null)}><Icon name="close" /></button><PropertyCard key={selected.id} {...selected} /><p className="map-selection-location"><Icon name="pin" width="15" height="15" />{selected.isExclusive && selected.locationMode === 'EXACT' ? 'Ubicación exacta' : `Zona aproximada · radio de ${selected.locationRadiusMeters || 500} m`}</p></div>}
        </section>
      </div>
      
    </>}
  </div>
}

function MapResult({ property, selected, onSelect }: { property: MapProperty; selected: boolean; onSelect: () => void }) {
  const [failed, setFailed] = useState(false)
  const operation = property.operation === 'RENTAL' ? 'Alquiler' : property.operation === 'ANTICRETIC' ? 'Anticrético' : 'Venta'
  return <article className={`map-result ${selected ? 'is-selected' : ''}`}>
    <button className="map-result-select" onClick={onSelect} aria-pressed={selected} aria-label={`Ver ${property.title} en el mapa`}>
      <div className="map-result-cover">{property.images?.[0] && !failed ? <img src={property.images[0]} alt="" loading="lazy" onError={() => setFailed(true)} /> : <Icon name="home" width="28" height="28" />}</div>
      <div className="map-result-copy"><span className="map-result-operation">{operation} · {PROPERTY_TYPES[property.type] || property.type}</span><strong>{formatPrice(property.price, property.currency)}</strong><h3>{property.title}</h3><span className="map-result-city">{property.city}{property.region && property.region !== property.city ? `, ${property.region}` : ''}</span><span className="map-result-specs">{property.bedrooms != null && `${property.bedrooms} hab. · `}{property.areaSquareMeters != null && `${Number(property.areaSquareMeters).toLocaleString('es-BO')} m²`}</span></div>
    </button>
    <div className="map-result-actions"><span><Icon name="pin" width="13" height="13" />{selected ? 'Seleccionada en el mapa' : 'Ver en el mapa'}</span><Link to={`/properties/${property.id}`}>Ver ficha <Icon name="arrow" width="14" height="14" /></Link></div>
  </article>
}
