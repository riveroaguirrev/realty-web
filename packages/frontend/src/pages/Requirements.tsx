import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { requirementsAPI, requirementError } from '@/services/requirements'
import { conversationsAPI } from '@/services/conversations'
import { formatPrice, PROPERTY_TYPES } from '@/utils/propertyPresentation'
import type { RequirementRecord } from '@shared/types/requirements'
import { RequirementPushControl } from '@/components/requirements/RequirementPushControl'
import { Icon } from '@/components/ui/Icon'
import './Requirements.css'
export const OPERATIONS = { RENTAL: 'Alquiler', SALE: 'Compra', ANTICRETIC: 'Anticrético' }
export const STATUSES = { ACTIVE: 'Activo', PAUSED: 'Pausado', FULFILLED: 'Atendido', EXPIRED: 'Vencido' }
export const requirementBudget = (r: RequirementRecord) => r.priceMin == null && r.priceMax == null ? 'Presupuesto abierto' : r.priceMin != null && r.priceMax != null ? `${formatPrice(r.priceMin, r.currency)} – ${formatPrice(r.priceMax, r.currency)}` : `${r.priceMax != null ? 'Hasta' : 'Desde'} ${formatPrice(r.priceMax ?? r.priceMin!, r.currency)}`
export const Requirements = () => {
  const { accessToken, user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'all' | 'mine' | 'organization'>('all')
  const mine = tab === 'mine'
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<string | null | undefined>(undefined)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const query = useQuery({ queryKey: ['requirements', accessToken, tab, page], queryFn: () => requirementsAPI.list(accessToken!, mine, page, tab === 'organization'), enabled: !!accessToken })
  const total = Number(query.data?.meta?.total || 0)
  const rows = query.data?.data || []
  const r = selected === null ? undefined : rows.find(item => item.id === selected) || rows[0]
  const switchTab = (value: typeof tab) => { setTab(value); setPage(1); setSelected(undefined); setError('') }
  const contact = async () => {
    if (!r || !accessToken) return
    setBusy(true); setError('')
    try { const conversation = await conversationsAPI.create(accessToken, [r.buyerId]); navigate(`/messages/${conversation.id}`) }
    catch (err) { setError(requirementError(err)) } finally { setBusy(false) }
  }
  return <div className="requirements-page req-workspace">
    <header className="req-heading"><div><h1>Requerimientos</h1><p>Encuentra oportunidades para tus inmuebles</p></div><Link className="button button-primary" to="/requirements/create"><Icon name="plus" />Publicar requerimiento</Link></header>
    <div className="req-toolbar"><div className="req-segments" aria-label="Requerimientos"><button aria-pressed={tab === 'all'} onClick={() => switchTab('all')}>Todos los activos</button><button aria-pressed={mine} onClick={() => switchTab('mine')}>Mis requerimientos</button>{user?.organizationId && <button aria-pressed={tab === 'organization'} onClick={() => switchTab('organization')}><Icon name="building" />Mi organización</button>}</div>{accessToken && <RequirementPushControl token={accessToken} />}</div>
    {query.isLoading && <p role="status">Cargando requerimientos…</p>}
    {query.isError && <div className="req-error" role="alert">{requirementError(query.error)} <button className="button" onClick={() => query.refetch()}>Reintentar</button></div>}
    {query.data && !rows.length && <div className="req-empty"><h2>{mine ? 'Publica la búsqueda de tu cliente' : tab === 'organization' ? 'Tu organización aún no tiene requerimientos activos' : 'Aún no hay requerimientos activos'}</h2><Link className="button button-primary" to="/requirements/create">Crear requerimiento</Link></div>}
    {!!rows.length && <div className={`req-browser ${!r ? 'req-browser-full' : ''}`}><section className="req-results" aria-label="Lista de requerimientos"><div className="req-results-heading"><strong>{total} {total === 1 ? 'requerimiento' : 'requerimientos'}</strong><span>Más recientes primero</span></div>{rows.map(item => <button key={item.id} className={`req-row ${r?.id === item.id ? 'is-selected' : ''}`} aria-pressed={r?.id === item.id} onClick={() => { setSelected(item.id); setError('') }}><span className="req-row-icon"><Icon name="building" /></span><span className="req-row-body"><span className="req-row-top"><strong>{item.title}</strong><span className="req-tags"><span>{OPERATIONS[item.operation]}</span><span className={`req-state req-state-${item.status.toLowerCase()}`}>{STATUSES[item.status]}</span></span></span><span className="req-row-facts"><span><Icon name="pin" />{item.cities.join(', ')}{item.zones.length ? ` · ${item.zones.join(', ')}` : ''}</span><b>{requirementBudget(item)}</b>{item.bedroomsMin != null && <span>{item.bedroomsMin}+ hab.</span>}{item.areaMin != null && <span>{item.areaMin} m² mín.</span>}</span><span className="req-row-advisor">{item.buyer.firstName} {item.buyer.lastName}{item.visibility === 'ORGANIZATION' && <span className="req-organization-label"> · Solo organización</span>}</span></span><Icon name="arrow" /></button>)}</section>
    {r && <aside className="req-preview" key={r.id} aria-label="Detalle de búsqueda"><div className="req-preview-heading"><h2>Detalle de búsqueda</h2><button className="icon-button" aria-label="Cerrar detalle" onClick={() => setSelected(null)}><Icon name="close" /></button></div><h3>{r.title}</h3><p className="req-preview-location"><Icon name="pin" />{r.cities.join(', ')}{r.zones.length ? ` · ${r.zones.join(', ')}` : ''}</p><div className="req-tags"><span>{OPERATIONS[r.operation]}</span><span className={`req-state req-state-${r.status.toLowerCase()}`}>{STATUSES[r.status]}</span></div><div className="req-preview-budget"><span>Presupuesto</span><strong>{requirementBudget(r)}</strong></div><p className="req-preview-type">{r.propertyType.map(t => PROPERTY_TYPES[t] || t).join(', ')}</p><div className="req-preview-facts">{r.bedroomsMin != null && <span><Icon name="bed" />{r.bedroomsMin}+ habitaciones</span>}{r.bathroomsMin != null && <span><Icon name="bath" />{r.bathroomsMin}+ baños</span>}{r.areaMin != null && <span><Icon name="area" />{r.areaMin} m² mín.</span>}{r.requiresGarage && <span>Con garaje</span>}{r.requiresGroundFloor && <span>Planta baja</span>}{r.petsRequired && <span>Admite mascotas</span>}</div>{r.description && <details className="req-preview-description"><summary>Preferencias adicionales</summary><p>{r.description}</p></details>}<div className="req-preview-advisor"><span className="req-avatar">{r.buyer.firstName[0]}{r.buyer.lastName[0]}</span><div><small>Asesor</small><strong>{r.buyer.firstName} {r.buyer.lastName}</strong></div></div><div className="req-preview-actions">{r.buyerId !== user?.id && accessToken && <><Link className="button button-primary" to={`/requirements/${r.id}#coincidencias`}><Icon name="home" />Proponer inmueble</Link><button className="button" disabled={busy} onClick={contact}><Icon name="message" />{busy ? 'Abriendo…' : 'Contactar'}</button></>}<Link className="req-detail-link" to={`/requirements/${r.id}`}>{r.buyerId === user?.id ? 'Gestionar búsqueda y ver coincidencias' : 'Ver búsqueda y coincidencias'}<Icon name="arrow" /></Link></div>{error && <p role="alert" className="req-error">{error}</p>}</aside>}</div>}
    {total > 20 && <div className="req-tabs"><button className="button" disabled={page <= 1} onClick={() => { setPage(p => p - 1); setSelected(undefined) }}>Anterior</button><span>Página {page} de {Math.ceil(total / 20)}</span><button className="button" disabled={page * 20 >= total} onClick={() => { setPage(p => p + 1); setSelected(undefined) }}>Siguiente</button></div>}
  </div>
}
