import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { requirementsAPI, requirementError } from '@/services/requirements'
import { formatPrice, PROPERTY_TYPES } from '@/utils/propertyPresentation'
import type { RequirementRecord } from '@shared/types/requirements'
import { RequirementPushControl } from '@/components/requirements/RequirementPushControl'
import './Requirements.css'
export const OPERATIONS = { RENTAL: 'Alquiler', SALE: 'Compra', ANTICRETIC: 'Anticrético' }
export const STATUSES = { ACTIVE: 'Activo', PAUSED: 'Pausado', FULFILLED: 'Atendido', EXPIRED: 'Vencido' }
export const requirementBudget = (r: RequirementRecord) => r.priceMin == null && r.priceMax == null ? 'Presupuesto abierto' : r.priceMin != null && r.priceMax != null ? `${formatPrice(r.priceMin, r.currency)} – ${formatPrice(r.priceMax, r.currency)}` : `${r.priceMax != null ? 'Hasta' : 'Desde'} ${formatPrice(r.priceMax ?? r.priceMin!, r.currency)}`
export const Requirements = () => {
  const { accessToken } = useAuth()
  const [mine, setMine] = useState(false)
  const [page, setPage] = useState(1)
  const query = useQuery({ queryKey: ['requirements', accessToken, mine, page], queryFn: () => requirementsAPI.list(accessToken!, mine, page), enabled: !!accessToken })
  const total = Number(query.data?.meta?.total || 0)
  return <div className="requirements-page"><div className="page-heading"><div><p className="eyebrow">OPORTUNIDADES COMPARTIDAS</p><h1>Requerimientos<span className="greeting-dot">.</span></h1><p>Las búsquedas de tus clientes conectadas con la comunidad de asesores.</p></div><Link className="button button-primary" to="/requirements/create">Publicar requerimiento</Link></div>
    {accessToken && <RequirementPushControl token={accessToken} />}
    <div className="req-tabs"><button className={`button ${!mine ? 'button-primary' : ''}`} onClick={() => { setMine(false); setPage(1) }}>Todos los activos</button><button className={`button ${mine ? 'button-primary' : ''}`} onClick={() => { setMine(true); setPage(1) }}>Mis requerimientos</button><span>{total} requerimientos</span></div>
    {query.isLoading && <p role="status">Cargando requerimientos…</p>}
    {query.isError && <div className="req-error" role="alert">{requirementError(query.error)} <button className="button" onClick={() => query.refetch()}>Reintentar</button></div>}
    {query.data && !query.data.data.length && <div className="req-empty"><h2>{mine ? 'Publica la búsqueda de tu cliente' : 'Aún no hay requerimientos activos'}</h2><p>Describe lo que necesita y encuentra opciones entre las propiedades publicadas.</p><Link className="button button-primary" to="/requirements/create">Crear requerimiento</Link></div>}
    <div className="req-grid">{query.data?.data.map(r => <article className="req-card" key={r.id}><div className="req-card-meta"><span>{OPERATIONS[r.operation]}</span><span>{STATUSES[r.status]}</span></div><Link className="req-title" to={`/requirements/${r.id}`}><h2>{r.title}</h2></Link><p className="req-location">{r.cities.join(', ')}{r.zones.length > 0 ? ` · ${r.zones.join(', ')}` : ''}</p><strong>{requirementBudget(r)}</strong><p>{r.propertyType.map(t => PROPERTY_TYPES[t] || t).join(', ')}{r.areaMin ? ` · Desde ${r.areaMin} m²` : ''}{r.bedroomsMin ? ` · ${r.bedroomsMin}+ habitaciones` : ''}</p><footer><span>{r.buyer.firstName} {r.buyer.lastName}</span><Link to={`/requirements/${r.id}`}>Ver búsqueda →</Link></footer></article>)}</div>
    {total > 20 && <div className="req-tabs"><button className="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</button><span>Página {page} de {Math.ceil(total / 20)}</span><button className="button" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>Siguiente</button></div>}
  </div>
}
