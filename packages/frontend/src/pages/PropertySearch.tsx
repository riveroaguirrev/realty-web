import { readMapFilters } from '@/utils/propertyMap'
import type { SearchFilters } from '@/components/property/SearchFilters'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { SearchFiltersComponent } from '@/components/property/SearchFilters'
import { propertySearchAPI } from '@/services/propertySearch'
import { PropertyCard, PropertyCardProps } from '@/components/property/PropertyCard'
import { Pagination } from '@/components/ui/Pagination'
import { Icon } from '@/components/ui/Icon'
export const PropertySearch = () => {
  const { accessToken } = useAuth()
  const [params, setParams] = useSearchParams()
  const filters = readMapFilters(params)
  const page = Math.max(1, Math.floor(Number(params.get('page')) || 1))
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['property-search', accessToken, filters, page], queryFn: () => propertySearchAPI.search(accessToken!, { ...filters, page, pageSize: 12 }), enabled: !!accessToken })
  const search = (values: SearchFilters) => { const next = new URLSearchParams(); Object.entries(values).forEach(([key,value]) => { if (value !== undefined && value !== '') next.set(key,String(value)) }); setParams(next) }
  return <div><div className="page-heading"><div><p className="eyebrow">ENCUENTRA TU PRÓXIMA OPORTUNIDAD</p><h1>Explorar propiedades</h1><p>Busca por ubicación, tipo y presupuesto. Guarda las que te interesan.</p></div><Link className="button button-secondary" to={`/map?${params.toString()}`}><Icon name="map" />Ver en mapa</Link></div><SearchFiltersComponent key={JSON.stringify(filters)} initialFilters={filters} onSearch={search} isLoading={isLoading} />
    <div className="section-heading"><h2>{isLoading ? 'Buscando propiedades…' : `${data?.pagination?.total ?? data?.properties.length ?? 0} propiedades encontradas`}</h2><span className="muted">{Object.keys(filters).length ? 'Búsqueda personalizada' : 'Todas las propiedades'}</span></div>
    {isLoading ? <div className="loading-panel" role="status">Estamos buscando tu próximo espacio…</div> : isError ? <div className="empty-panel" role="alert"><h3>No pudimos completar la búsqueda</h3><p>Comprueba tu conexión y vuelve a intentarlo.</p><button className="button button-primary" onClick={() => refetch()}>Reintentar</button></div> : data?.properties.length ? <div className="property-grid">{data.properties.map((property: PropertyCardProps) => <PropertyCard key={property.id} {...property} />)}</div> : <div className="empty-panel"><Icon name="search" width="32" height="32" /><h3>No encontramos propiedades</h3><p>Prueba con otra ciudad o amplía tu presupuesto.</p><button className="button button-secondary" onClick={() => search({})}>Ver todas las propiedades</button></div>}
    <Pagination page={page} totalPages={data?.pagination?.totalPages || 0} disabled={isLoading} onChange={next => { const updated = new URLSearchParams(params); updated.set('page',String(next)); setParams(updated) }} />
  </div>
}
