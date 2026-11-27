import { useRef, useState, type KeyboardEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { requirementsAPI, requirementError } from '@/services/requirements'
import { conversationsAPI } from '@/services/conversations'
import { formatPrice, PROPERTY_TYPES } from '@/utils/propertyPresentation'
import type { RequirementRecord } from '@shared/types/requirements'
import { RequirementPushControl } from '@/components/requirements/RequirementPushControl'
import { Icon, type IconName } from '@/components/ui/Icon'
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
  const pendingContact = useRef(false)
  const previewRef = useRef<HTMLElement>(null)
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const query = useQuery({ queryKey: ['requirements', accessToken, tab, page], queryFn: () => requirementsAPI.list(accessToken!, mine, page, tab === 'organization'), enabled: !!accessToken })
  const total = Number(query.data?.meta?.total || 0)
  const rows = query.data?.data || []
  const r = selected === null ? undefined : rows.find(item => item.id === selected) || rows[0]
  const tabs: { value: typeof tab; label: string; icon: IconName }[] = [
    { value: 'all', label: 'Todos los activos', icon: 'grid' },
    { value: 'mine', label: 'Mis requerimientos', icon: 'user' },
    ...(user?.organizationId ? [{ value: 'organization' as const, label: 'Mi organización', icon: 'building' as const }] : []),
  ]
  const switchTab = (value: typeof tab) => { setTab(value); setPage(1); setSelected(undefined); setError('') }
  const navigateTabs = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
    switchTab(tabs[next].value)
    tabRefs.current[next]?.focus()
  }
  const openPreview = (id: string) => {
    setSelected(id); setError('')
    if (window.matchMedia('(max-width: 760px)').matches) window.requestAnimationFrame(() => {
      previewRef.current?.focus({ preventScroll: true })
      previewRef.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    })
  }
  const closePreview = () => {
    const row = r && rowRefs.current[r.id]
    setSelected(null); setError('')
    row?.focus({ preventScroll: true })
    if (window.matchMedia('(max-width: 760px)').matches) row?.scrollIntoView({ block: 'center', behavior: 'auto' })
  }
  const navigateRows = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? rows.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length
    setSelected(rows[next].id); setError('')
    rowRefs.current[rows[next].id]?.focus()
  }
  const changePage = (value: number) => {
    setPage(value); setSelected(undefined); setError('')
    document.getElementById('req-results-heading')?.scrollIntoView({block: 'start', behavior: 'auto'})
  }
  const contact = async () => {
    if (!r || !accessToken || pendingContact.current) return
    pendingContact.current = true
    setBusy(true); setError('')
    try {
      const conversation = await conversationsAPI.create(accessToken, [r.buyerId])
      if (!conversation?.id || typeof conversation.id !== 'string') throw new Error('No pudimos abrir la conversación. Inténtalo de nuevo.')
      navigate(`/messages/${conversation.id}`)
    } catch (err) { setError(requirementError(err)) }
    finally { pendingContact.current = false; setBusy(false) }
  }
  return <div className="requirements-page req-workspace">
    <header className="req-heading"><div className="req-heading-title"><span className="req-heading-icon"><Icon name="search" width="25" height="25" /></span><h1>Requerimientos</h1></div><Link className="button button-primary" to="/requirements/create"><Icon name="plus" />Publicar requerimiento</Link></header>
    <div className="req-toolbar"><div className="req-segments" role="group" aria-label="Requerimientos">{tabs.map((item, index) => <button type="button" key={item.value} ref={element => { tabRefs.current[index] = element }} aria-pressed={tab === item.value} onKeyDown={event => navigateTabs(event, index)} onClick={() => switchTab(item.value)}><Icon name={item.icon} />{item.label}</button>)}</div>{accessToken && <RequirementPushControl token={accessToken} />}</div>
    {query.isLoading && <div className="req-list-loading" role="status"><Icon name="search" />Cargando requerimientos…</div>}
    {query.isError && <div className="req-error" role="alert">{requirementError(query.error)} <button type="button" className="button" onClick={() => query.refetch()}>Reintentar</button></div>}
    {query.data && !rows.length && <div className="req-empty"><span className="req-empty-icon"><Icon name="search" width="32" height="32" /></span><h2>{mine ? 'Publica la búsqueda de tu cliente' : tab === 'organization' ? 'Tu organización aún no tiene requerimientos activos' : 'Aún no hay requerimientos activos'}</h2><Link className="button button-primary" to="/requirements/create"><Icon name="plus" />Crear requerimiento</Link></div>}
    {!!rows.length && <div className={`req-browser ${!r ? 'req-browser-full' : ''}`}>
      <section className="req-results" aria-label="Lista de requerimientos"><div className="req-results-heading" id="req-results-heading"><strong>{total} {total === 1 ? 'requerimiento' : 'requerimientos'}</strong><span><Icon name="calendar" width="14" height="14" />Más recientes primero</span></div>
      {rows.map((item, index) => <button type="button" key={item.id} ref={element => { rowRefs.current[item.id] = element }} className={`req-row ${r?.id === item.id ? 'is-selected' : ''}`} data-operation={item.operation} aria-pressed={r?.id === item.id} aria-controls="req-preview-panel" onKeyDown={event => navigateRows(event, index)} onClick={() => openPreview(item.id)}>
        <span className="req-row-icon"><Icon name={item.propertyType[0] === 'HOUSE' ? 'home' : item.propertyType[0] === 'LAND' ? 'map' : 'building'} /></span>
        <span className="req-row-body"><span className="req-row-top"><strong>{item.title}</strong><span className="req-tags"><span className="req-operation-tag">{OPERATIONS[item.operation]}</span><span className={`req-state req-state-${item.status.toLowerCase()}`}><i aria-hidden="true" />{STATUSES[item.status]}</span></span></span>
          <span className="req-row-budget"><Icon name="money" width="17" height="17" />{requirementBudget(item)}</span>
          <span className="req-row-facts"><span><Icon name="pin" />{item.cities.join(', ')}{item.zones.length ? ` · ${item.zones.join(', ')}` : ''}</span>{item.bedroomsMin != null && <span><Icon name="bed" />{item.bedroomsMin}+ hab.</span>}{item.areaMin != null && <span><Icon name="area" />{item.areaMin} m² mín.</span>}</span>
          <span className="req-row-advisor"><Icon name="user" width="13" height="13" />{item.buyer.firstName} {item.buyer.lastName}{item.visibility === 'ORGANIZATION' && <span className="req-organization-label"><Icon name="building" width="13" height="13" />Solo organización</span>}</span>
        </span><Icon name="chevronRight" className="req-row-arrow" width="18" height="18" />
      </button>)}
      </section>
      {r && <aside ref={previewRef} className="req-preview" key={r.id} id="req-preview-panel" data-operation={r.operation} tabIndex={-1} aria-label="Detalle de búsqueda" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); closePreview() } }}>
        <div className="req-preview-heading"><span><Icon name="eye" width="17" height="17" />Vista previa</span><button type="button" className="icon-button" aria-label="Cerrar detalle" onClick={closePreview}><Icon name="close" /></button></div>
        <div className="req-preview-content"><h2 className="req-preview-title">{r.title}</h2>
        <div className="req-tags"><span className="req-operation-tag">{OPERATIONS[r.operation]}</span><span className={`req-state req-state-${r.status.toLowerCase()}`}><i aria-hidden="true" />{STATUSES[r.status]}</span></div>
        <p className="req-preview-location"><Icon name="pin" />{r.cities.join(', ')}{r.zones.length ? ` · ${r.zones.join(', ')}` : ''}</p>
        <div className="req-preview-budget"><span><Icon name="money" width="16" height="16" />Presupuesto</span><strong>{requirementBudget(r)}</strong></div>
        <p className="req-preview-type"><Icon name="building" width="16" height="16" />{r.propertyType.map(t => PROPERTY_TYPES[t] || t).join(', ')}</p>
        <div className="req-preview-facts">{r.bedroomsMin != null && <span><Icon name="bed" />{r.bedroomsMin}+ habitaciones</span>}{r.bathroomsMin != null && <span><Icon name="bath" />{r.bathroomsMin}+ baños</span>}{r.areaMin != null && <span><Icon name="area" />{r.areaMin} m² mín.</span>}{r.requiresGarage && <span><Icon name="car" />Con garaje</span>}{r.requiresGroundFloor && <span><Icon name="home" />Planta baja</span>}{r.petsRequired && <span><Icon name="paw" />Admite mascotas</span>}</div>
        {r.description && <details className="req-preview-description"><summary><Icon name="file" width="17" height="17" />Preferencias adicionales<Icon name="chevronRight" width="15" height="15" /></summary><p>{r.description}</p></details>}
        <div className="req-preview-advisor"><span className="req-avatar">{r.buyer.firstName[0]}{r.buyer.lastName[0]}</span><div><small>Asesor</small><strong>{r.buyer.firstName} {r.buyer.lastName}</strong></div>{r.buyerId === user?.id && <span className="req-own-badge">Tú</span>}</div>
        </div><div className="req-preview-actions">{r.buyerId !== user?.id && accessToken && <><Link className="button button-primary" to={`/requirements/${r.id}#coincidencias`}><Icon name="home" />Proponer inmueble</Link><button type="button" className="button button-secondary" disabled={busy} onClick={contact}><Icon name="message" />{busy ? 'Abriendo…' : 'Contactar'}</button></>}<Link className="req-detail-link" to={`/requirements/${r.id}`}>{r.buyerId === user?.id ? 'Gestionar búsqueda' : 'Ver requerimiento'}<Icon name="arrow" /></Link></div>
        {error && <p role="alert" className="req-error">{error}</p>}
      </aside>}
    </div>}
    {total > 20 && <nav className="req-list-pagination" aria-label="Páginas de requerimientos"><button type="button" className="button button-secondary" disabled={page <= 1 || query.isFetching} onClick={() => changePage(page - 1)}><Icon name="back" width="17" height="17" />Anterior</button><span>Página {page} de {Math.ceil(total / 20)}</span><button type="button" className="button button-secondary" disabled={page * 20 >= total || query.isFetching} onClick={() => changePage(page + 1)}>Siguiente<Icon name="arrow" width="17" height="17" /></button></nav>}
  </div>
}
