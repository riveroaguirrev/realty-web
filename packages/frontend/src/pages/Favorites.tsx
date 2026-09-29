import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { favoritesAPI } from '@/services/favorites'
import { PropertyCard, PropertyCardProps } from '@/components/property/PropertyCard'
import { Pagination } from '@/components/ui/Pagination'
import { Icon } from '@/components/ui/Icon'
export const Favorites = () => {
  const { accessToken } = useAuth()
  const [page, setPage] = useState(1)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['favorites',accessToken,page], queryFn: () => favoritesAPI.list(accessToken!,page,12), enabled: !!accessToken })
  const remove = async (id: string) => {
    if (!accessToken || removingId) return
    setRemovingId(id); setError('')
    try { await favoritesAPI.remove(accessToken,id); if (data?.properties.length === 1 && page > 1) setPage(page-1); else await refetch() } catch { setError('No pudimos quitar esta propiedad de tus favoritos. Inténtalo de nuevo.') } finally { setRemovingId(null) }
  }
  return <div><div className="page-heading"><div><p className="eyebrow">ESPACIOS QUE TE INTERESAN</p><h1>Mis favoritos</h1><p>Tu selección de propiedades, lista para cuando quieras dar el siguiente paso.</p></div></div>
    {error && <div role="alert" className="form-error">{error}</div>}
    {isLoading ? <div className="loading-panel" role="status">Cargando tus favoritos…</div> : isError ? <div className="empty-panel" role="alert"><h3>No pudimos cargar tus favoritos</h3><button className="button button-secondary" onClick={() => refetch()}>Reintentar</button></div> : !data?.properties.length ? <div className="empty-panel"><Icon name="heart" width="32" height="32" /><h3>Guarda lo que te inspira</h3><p>Abre una propiedad y añádela a favoritos para encontrarla fácilmente aquí.</p><Link to="/search" className="button button-primary"><Icon name="search" />Explorar propiedades</Link></div> : <div className="property-grid">{data.properties.map((property: PropertyCardProps) => <div key={property.id} className="relative"><PropertyCard {...property} /><button onClick={() => remove(property.id)} disabled={!!removingId} className="favorite-button" aria-label={`Quitar ${property.title} de favoritos`} title="Quitar de favoritos"><Icon name="heart" fill="currentColor" /></button></div>)}</div>}
    <Pagination page={page} totalPages={Math.ceil((data?.pagination?.total || 0)/12)} onChange={setPage} disabled={isLoading} />
  </div>
}
