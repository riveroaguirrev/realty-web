import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { propertyAPI } from '@/services/property'
import { PropertyCard, PropertyCardProps } from '@/components/property/PropertyCard'
import { getErrorMessage } from '@/utils/errorMessage'
import { getPropertyStatusLabel } from '@/utils/propertyStatus'
import { Pagination } from '@/components/ui/Pagination'
import { Icon } from '@/components/ui/Icon'
interface Property extends PropertyCardProps { status: string }
export const Properties = () => {
  const { accessToken } = useAuth()
  const [page, setPage] = useState(1)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['my-properties', accessToken, page], queryFn: () => propertyAPI.getMyPropertiesPage(accessToken!, page), enabled: !!accessToken })
  const remove = async (property: Property) => {
    if (!accessToken || deleting) return
    if (!window.confirm(`¿Eliminar “${property.title}”? Esta acción no se puede deshacer.`)) return
    setDeleting(property.id); setError(null)
    try { await propertyAPI.remove(accessToken, property.id); if (data?.properties.length === 1 && page > 1) setPage(page - 1); else await refetch() } catch (err) { setError(getErrorMessage(err, 'No pudimos eliminar la propiedad. Inténtalo de nuevo.')) } finally { setDeleting(null) }
  }
  return <div><div className="page-heading"><div><p className="eyebrow">TU CARTERA INMOBILIARIA</p><h1>Mis propiedades</h1><p>Administra tus publicaciones, actualiza sus datos y mantén su estado al día.</p></div></div>
    <div className="section-heading"><h2>{data ? `${data.total} publicaciones` : 'Tus publicaciones'}</h2><Link to="/properties/create" className="text-link"><Icon name="plus" />Nueva propiedad</Link></div>
    {error && <div role="alert" className="form-error">{error}</div>}
    {isLoading ? <div className="loading-panel" role="status">Cargando tus propiedades…</div> : isError ? <div className="empty-panel" role="alert"><h3>No pudimos cargar tus propiedades</h3><button className="button button-secondary" onClick={() => refetch()}>Reintentar</button></div> : !data?.properties.length ? <div className="empty-panel"><Icon name="home" width="32" height="32" /><h3>Tu próxima publicación empieza aquí</h3><p>Agrega los datos y las fotografías de tu propiedad para que puedan encontrarla.</p><Link to="/properties/create" className="button button-primary"><Icon name="plus" />Publicar mi primera propiedad</Link></div> : <div className="property-grid">{data.properties.map((property: Property) => <div key={property.id} className="managed-property"><PropertyCard {...property} /><div className="property-management"><span className="status-pill">{getPropertyStatusLabel(property.status)}</span><div><Link to={`/properties/${property.id}/edit`} className="text-link">Editar</Link><button className="delete-link" disabled={!!deleting} onClick={() => remove(property)}>{deleting === property.id ? 'Eliminando…' : 'Eliminar'}</button></div></div></div>)}</div>}
    <Pagination page={page} totalPages={data?.totalPages || 0} onChange={setPage} disabled={isLoading} />
  </div>
}
