import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { propertyAPI } from '@/services/property'
import { PropertyCard, PropertyCardProps } from '@/components/property/PropertyCard'
import { getErrorMessage } from '@/utils/errorMessage'
import { PropertyStatusControl } from '@/components/property/PropertyStatusControl'
import { PropertyStatusFilter } from '@/components/property/PropertyStatusFilter'
import { getPropertyStatusLabel } from '@/utils/propertyStatus'
import { Pagination } from '@/components/ui/Pagination'
import { Icon } from '@/components/ui/Icon'
import './Properties.css'
interface Property extends PropertyCardProps { status: string }
export const Properties = () => {
  const { accessToken } = useAuth()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { data, isLoading, isFetching, isError, refetch } = useQuery({ queryKey: ['my-properties', accessToken, page, status], queryFn: () => propertyAPI.getMyPropertiesPage(accessToken!, page, 12, status), enabled: !!accessToken })
  const currentPage = data?.page ?? page
  const changeStatus = (value: string) => { setStatus(value); setPage(1); setError(null) }
  const changePage = (value: number) => {
    setPage(value)
    document.getElementById('my-property-results')?.scrollIntoView({ block: 'start', behavior: 'auto' })
  }
  const remove = async (property: Property) => {
    if (!accessToken || deleting) return
    if (!window.confirm(`¿Eliminar “${property.title}”? Esta acción no se puede deshacer.`)) return
    setDeleting(property.id); setError(null)
    try { await propertyAPI.remove(accessToken, property.id); if (data?.properties.length === 1 && currentPage > 1) setPage(currentPage - 1); else await refetch() } catch (err) { setError(getErrorMessage(err, 'No pudimos eliminar la propiedad. Inténtalo de nuevo.')) } finally { setDeleting(null) }
  }
  return <div className="my-properties-page"><div className="page-heading my-properties-heading">
    <div className="my-properties-title"><span className="my-properties-icon"><Icon name="home" width="25" height="25" /></span><h1>Mis propiedades</h1></div>
    <Link to="/properties/create" className="button button-primary new-property-button"><Icon name="plus" />Nueva propiedad</Link>
  </div>
    <div className="property-list-toolbar" id="my-property-results"><h2 aria-live="polite">{data ? <><strong>{data.total}</strong> {data.total === 1 ? 'publicación' : 'publicaciones'}</> : 'Tus publicaciones'}</h2><div className="my-properties-tools"><PropertyStatusFilter id="my-properties-status" value={status} onChange={changeStatus} /><div className="my-properties-view" role="group" aria-label="Vista de propiedades"><button type="button" aria-label="Vista de tarjetas" title="Vista de tarjetas" aria-pressed={view === 'grid'} onClick={() => setView('grid')}><Icon name="grid" width="19" height="19" /></button><button type="button" aria-label="Vista de lista" title="Vista de lista" aria-pressed={view === 'list'} onClick={() => setView('list')}><Icon name="menu" width="20" height="20" /></button></div></div></div>
    {error && <div role="alert" className="form-error">{error}</div>}
    {isLoading ? <div className="my-properties-loading" role="status"><span className="sr-only">Cargando tus propiedades…</span>{[0, 1, 2].map(item => <div className="my-property-skeleton" key={item} aria-hidden="true"><div /><span /><span /></div>)}</div>
      : isError ? <div className="empty-panel" role="alert"><h3>No pudimos cargar tus propiedades</h3><button className="button button-secondary" onClick={() => refetch()}>Reintentar</button></div>
      : !data?.properties.length ? status
        ? <div className="empty-panel"><Icon name="home" width="32" height="32" /><h3>No tienes propiedades en estado «{getPropertyStatusLabel(status)}»</h3><button className="button button-secondary" onClick={() => changeStatus('')}>Ver todos los estados</button></div>
        : <div className="empty-panel"><Icon name="home" width="32" height="32" /><h3>Tu primera propiedad, aquí</h3><Link to="/properties/create" className="button button-primary"><Icon name="plus" />Publicar propiedad</Link></div>
      : <div className={`property-grid my-properties-${view}`} aria-busy={isFetching}>{data.properties.map((property: Property) => <div key={property.id} className="managed-property">
        <PropertyCard {...property} />
        <div className="property-management">
          <PropertyStatusControl token={accessToken!} property={property} compact />
          <div className="property-management-actions">
            <Link to={`/properties/${property.id}/edit`} className="property-management-edit"><Icon name="edit" width="15" height="15" />Editar</Link>
            <button type="button" className="property-management-delete" aria-label={`Eliminar ${property.title}`} title="Eliminar propiedad" disabled={!!deleting} onClick={() => remove(property)}>{deleting === property.id ? <span className="property-delete-pending" role="status" aria-label="Eliminando propiedad">…</span> : <Icon name="trash" width="17" height="17" />}</button>
          </div>
        </div>
      </div>)}</div>}
    <Pagination page={currentPage} totalPages={data?.totalPages || 0} onChange={changePage} disabled={isFetching || !!deleting} />
  </div>
}
