import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { requirementsAPI, requirementError } from '@/services/requirements'
import { conversationsAPI } from '@/services/conversations'
import { PropertyCard } from '@/components/property/PropertyCard'
import { RequirementVisibilityControl } from '@/components/requirements/RequirementVisibilityControl'
import type { RequirementVisibility } from '@shared/types/requirements'
import { RequirementCompatibility } from '@/components/requirements/RequirementCompatibility'
import { PROPERTY_TYPES } from '@/utils/propertyPresentation'
import { OPERATIONS, STATUSES, requirementBudget } from './Requirements'
import type { RequirementStatus } from '@shared/types/requirements'
import './Requirements.css'
import './RequirementDetail.css'
import { Icon } from '@/components/ui/Icon'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { WhatsAppContact } from '@/components/ui/WhatsAppContact'
export const RequirementDetail = () => {
  const { id } = useParams()
  const { hash } = useLocation()
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
    retry: false,
    placeholderData: (previous, previousQuery) => previous?.data.id === id && previousQuery?.queryKey[2] === accessToken ? previous : undefined,
  })
  const r = query.data?.data
  useEffect(() => {
    if (r && hash === '#coincidencias') document.getElementById('coincidencias')?.scrollIntoView({ block: 'start' })
  }, [r?.id, hash])
  const updateStatus = async (status: RequirementStatus) => {
    setBusy(true); setError('')
    try {
      await requirementsAPI.update(accessToken!, id!, { status })
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['requirement', id] }), queryClient.invalidateQueries({ queryKey: ['requirements'] })])
    } catch (err) { setError(requirementError(err)) } finally { setBusy(false) }
  }
  const updateVisibility = async (visibility: RequirementVisibility) => {
    setBusy(true); setError('')
    try {
      await requirementsAPI.update(accessToken!, id!, { visibility })
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['requirement', id] }), queryClient.invalidateQueries({ queryKey: ['requirements'] }), queryClient.invalidateQueries({ queryKey: ['requirement-notifications'] })])
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
  return <div className="requirements-page requirement-detail-page">
    <Link className="req-back-button" to="/requirements"><Icon name="back" />Volver a requerimientos</Link>
    <header className="rd-heading"><div><div className="rd-badges"><span className={`rd-operation rd-operation-${r.operation.toLowerCase()}`}>{OPERATIONS[r.operation]}</span><span className={`rd-status rd-status-${r.status.toLowerCase()}`}><i />{STATUSES[r.status]}</span></div><h1>{r.title}</h1><p className="rd-author"><span className="rd-avatar" aria-hidden="true">{r.buyer.firstName?.slice(0,1)}{r.buyer.lastName?.slice(0,1)}</span>{r.buyer.firstName} {r.buyer.lastName}<span>· {new Date(r.createdAt).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' })}</span></p></div>{owner && <Link className="button button-secondary" to={`/requirements/${r.id}/edit`}><Icon name="edit" />Editar</Link>}</header>
    <section className="rd-summary" aria-label="Detalle del requerimiento"><div className="rd-summary-top"><div><h2>{requirementBudget(r)}{r.operation === 'RENTAL' && r.priceMax != null ? ' / mes' : ''}</h2><p className="rd-location"><Icon name="pin" />{r.cities.join(', ')}{r.zones.length ? ` · ${r.zones.join(', ')}` : ''}</p><p className="rd-type">{r.propertyType.map(t => PROPERTY_TYPES[t] || t).join(', ')}</p></div>
    {owner && (user?.organizationId || r.visibility === 'ORGANIZATION') && <RequirementVisibilityControl value={r.visibility || 'PUBLIC'} onChange={updateVisibility} disabled={busy} />}
    {!owner && r.visibility === 'ORGANIZATION' && <span className="rd-status"><Icon name="building" />Solo tu organización</span>}
    </div>
    <div className="rd-specs">{r.bedroomsMin != null && <span><Icon name="bed" />{r.bedroomsMin}+ dorm.</span>}{r.bathroomsMin != null && <span><Icon name="bath" />{r.bathroomsMin}+ baños</span>}{r.areaMin != null && <span><Icon name="area" />{r.areaMin}+ m²</span>}{r.requiresGarage && <span><Icon name="car" />Garaje</span>}{r.requiresGroundFloor && <span><Icon name="building" />Planta baja</span>}{r.petsRequired && <span><Icon name="paw" />Mascotas</span>}</div>
    {r.description && <details className="rd-description"><summary>Ver descripción y preferencias <span aria-hidden="true">⌄</span></summary><p>{r.description}</p></details>}
    </section>
    <div className="rd-actions">{owner ? <><button className="button button-secondary" disabled={busy} onClick={() => updateStatus(r.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE')}><span aria-hidden="true">{r.status === 'ACTIVE' ? 'Ⅱ' : '▷'}</span>{r.status === 'ACTIVE' ? 'Pausar' : 'Reactivar búsqueda'}</button>{r.status !== 'FULFILLED' && <button className="button button-primary" disabled={busy} onClick={() => updateStatus('FULFILLED')}><Icon name="check" />Marcar atendido</button>}</> : <>
      <WhatsAppContact phone={r.buyer.whatsappPhone} recipient={r.buyer.firstName}
        context={{ kind: 'requirement', title: r.title, url: new URL(`/requirements/${encodeURIComponent(r.id)}`, window.location.origin).href }} />
      <button className="button button-primary" disabled={busy} onClick={contact}><Icon name="message" />Contactar al asesor</button>
    </>}</div>
    {error && <p className="req-error" role="alert">{error}</p>}
    <div className="rd-matches-heading" id="coincidencias"><h2>Coincidencias <span>{r.suggestions.length}</span></h2><details className="rd-match-help"><summary>Cómo se calcula <span aria-hidden="true">⌄</span></summary><div><p>Hasta 12 opciones, de mayor a menor compatibilidad. Prioridad: habitaciones, zona, presupuesto, parqueo, mascotas, superficie y preferencias adicionales.</p><p>Solo cuentan los criterios solicitados. La zona se compara con lo escrito en el anuncio; las condiciones del texto libre deben confirmarse con el asesor.</p></div></details></div>
    <div className="req-match-filters rd-match-filters">
      <FilterSelect id="rd-min-score" label="Compatibilidad mínima" value={String(minScore)} options={[[ '0','Compatibilidad: Todas'],['70','70% o más'],['80','80% o más'],['90','90% o más']]} onChange={value => setMinScore(Number(value))} />
      <label className="req-check rd-budget-toggle"><input type="checkbox" role="switch" checked={withinBudget} disabled={r.priceMin == null && r.priceMax == null} onChange={event => setWithinBudget(event.target.checked)} /><span className="rd-switch" aria-hidden="true" />Dentro del presupuesto{r.priceMin == null && r.priceMax == null && <small>Presupuesto abierto</small>}</label>
      {query.isFetching && <span role="status">Actualizando coincidencias…</span>}
    </div>
    {!r.suggestions.length && <div className="req-empty"><h3>{r.status !== 'ACTIVE' ? 'La búsqueda no está activa' : minScore || withinBudget ? 'No hay opciones con estos filtros' : 'Aún no hay inmuebles compatibles'}</h3><p>{r.status !== 'ACTIVE' ? 'Reactiva el requerimiento para consultar sugerencias.' : minScore || withinBudget ? 'Reduce la compatibilidad mínima o amplía el presupuesto para revisar alternativas.' : 'Puedes volver a revisar cuando se publiquen nuevos inmuebles.'}</p>{!!(minScore || withinBudget) && <button className="button" onClick={() => { setMinScore(0); setWithinBudget(false) }}>Quitar filtros</button>} <button className="button" onClick={() => query.refetch()}>Actualizar sugerencias</button></div>}
    <div className="req-grid" aria-busy={query.isFetching}>{r.suggestions.map(s => <div className="req-suggestion" key={s.propertyId}><PropertyCard {...s.property} price={Number(s.property.price)} /><RequirementCompatibility suggestion={s} /></div>)}</div>
  </div>
}
