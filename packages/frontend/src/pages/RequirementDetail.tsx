import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { requirementsAPI, requirementError } from '@/services/requirements'
import { conversationsAPI } from '@/services/conversations'
import { PropertyCard } from '@/components/property/PropertyCard'
import { RequirementCompatibility } from '@/components/requirements/RequirementCompatibility'
import { PROPERTY_TYPES } from '@/utils/propertyPresentation'
import { OPERATIONS, STATUSES, requirementBudget } from './Requirements'
import type { RequirementStatus } from '@shared/types/requirements'
import './Requirements.css'
export const RequirementDetail = () => {
  const { id } = useParams()
  const { accessToken, user } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [minScore, setMinScore] = useState(0)
  const [withinBudget, setWithinBudget] = useState(false)
  const query = useQuery({
    queryKey: ['requirement', id, accessToken, minScore, withinBudget],
    queryFn: () => requirementsAPI.get(accessToken!, id!, { minScore, withinBudget }),
    enabled: !!id && !!accessToken,
    placeholderData: previous => previous?.data.id === id ? previous : undefined,
  })
  const r = query.data?.data
  const updateStatus = async (status: RequirementStatus) => {
    setBusy(true); setError('')
    try {
      await requirementsAPI.update(accessToken!, id!, { status })
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['requirement', id] }), queryClient.invalidateQueries({ queryKey: ['requirements'] })])
    } catch (err) { setError(requirementError(err)) } finally { setBusy(false) }
  }
  const contact = async () => {
    if (!r) return
    setBusy(true); setError('')
    try { const conversation = await conversationsAPI.create(accessToken!, [r.buyerId]); navigate(`/messages/${conversation.id}`) }
    catch (err) { setError(requirementError(err)) } finally { setBusy(false) }
  }
  if (query.isLoading) return <p role="status">Buscando inmuebles para este requerimiento…</p>
  if (query.isError) return <div className="req-error" role="alert">{requirementError(query.error)} <button className="button" onClick={() => query.refetch()}>Reintentar</button></div>
  if (!r) return null
  const owner = r.buyerId === user?.id
  return <div className="requirements-page"><Link to="/requirements">← Requerimientos</Link><div className="page-heading"><div><p className="eyebrow">{OPERATIONS[r.operation]} · {STATUSES[r.status]}</p><h1>{r.title}</h1><p>Publicado por {r.buyer.firstName} {r.buyer.lastName} · {new Date(r.createdAt).toLocaleDateString('es-BO')}</p></div></div>
    <div className="req-detail"><div><h2>{requirementBudget(r)}{r.operation === 'RENTAL' && r.priceMax != null ? ' / mes' : ''}</h2><p>{r.cities.join(', ')}{r.zones.length ? ` · ${r.zones.join(', ')}` : ''}</p><p>{r.propertyType.map(t => PROPERTY_TYPES[t] || t).join(', ')}</p>{r.description && <p className="req-description">{r.description}</p>}
      <div className="req-tags">{r.bedroomsMin != null && <span>{r.bedroomsMin}+ habitaciones</span>}{r.bathroomsMin != null && <span>{r.bathroomsMin}+ baños</span>}{r.areaMin != null && <span>Desde {r.areaMin} m²</span>}{r.requiresGarage && <span>Con garaje</span>}{r.requiresGroundFloor && <span>Planta baja</span>}{r.petsRequired && <span>Admite mascotas</span>}</div></div>
      <div className="req-actions">{owner ? <><Link className="button" to={`/requirements/${r.id}/edit`}>Editar</Link><button className="button" disabled={busy} onClick={() => updateStatus(r.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE')}>{r.status === 'ACTIVE' ? 'Pausar búsqueda' : 'Reactivar búsqueda'}</button>{r.status !== 'FULFILLED' && <button className="button button-primary" disabled={busy} onClick={() => updateStatus('FULFILLED')}>Marcar como atendido</button>}</> : <button className="button button-primary" disabled={busy} onClick={contact}>Contactar al asesor</button>}</div>
    </div>{error && <p className="req-error" role="alert">{error}</p>}
    <div className="req-suggestions-heading"><h2>Propiedades con más coincidencias</h2><p>Hasta 12 opciones, de mayor a menor compatibilidad. Prioridad: habitaciones, zona, presupuesto, parqueo, mascotas, superficie y preferencias adicionales.</p><p>Solo cuentan los criterios solicitados. La zona se compara con lo escrito en el anuncio; las condiciones del texto libre deben confirmarse con el asesor.</p></div>
    <div className="req-match-filters">
      <label>Compatibilidad mínima<select value={minScore} onChange={event => setMinScore(Number(event.target.value))}><option value={0}>Todas las coincidencias</option><option value={70}>70% o más</option><option value={80}>80% o más</option><option value={90}>90% o más</option></select></label>
      <label className="req-check"><input type="checkbox" checked={withinBudget} disabled={r.priceMin == null && r.priceMax == null} onChange={event => setWithinBudget(event.target.checked)} />Solo dentro del presupuesto{r.priceMin == null && r.priceMax == null && <small>Presupuesto abierto</small>}</label>
      {query.isFetching && <span role="status">Actualizando coincidencias…</span>}
    </div>
    {!r.suggestions.length && <div className="req-empty"><h3>{r.status !== 'ACTIVE' ? 'La búsqueda no está activa' : minScore || withinBudget ? 'No hay opciones con estos filtros' : 'Aún no hay inmuebles compatibles'}</h3><p>{r.status !== 'ACTIVE' ? 'Reactiva el requerimiento para consultar sugerencias.' : minScore || withinBudget ? 'Reduce la compatibilidad mínima o amplía el presupuesto para revisar alternativas.' : 'Puedes volver a revisar cuando se publiquen nuevos inmuebles.'}</p>{!!(minScore || withinBudget) && <button className="button" onClick={() => { setMinScore(0); setWithinBudget(false) }}>Quitar filtros</button>} <button className="button" onClick={() => query.refetch()}>Actualizar sugerencias</button></div>}
    <div className="req-grid" aria-busy={query.isFetching}>{r.suggestions.map(s => <div className="req-suggestion" key={s.propertyId}><PropertyCard {...s.property} price={Number(s.property.price)} /><RequirementCompatibility suggestion={s} /></div>)}</div>
  </div>
}
