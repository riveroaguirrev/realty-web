import { useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { organizationAPI } from '@/services/organization'
import { conversationsAPI } from '@/services/conversations'
import { getErrorMessage } from '@/utils/errorMessage'
import { PropertyCard } from '@/components/property/PropertyCard'
import { getPropertyStatusLabel } from '@/utils/propertyStatus'
import { isPropertyStatus, propertyStatusValue } from '@shared/propertyStatus'
import { Icon, type IconName } from '@/components/ui/Icon'
import { WhatsAppContact } from '@/components/ui/WhatsAppContact'
import './OrganizationAdvisorDetail.css'

const ADVISOR_STATUS: Record<string, string> = { ACTIVE: 'Activo', INACTIVE: 'Inactivo', BLOCKED: 'Bloqueado', ON_LEAVE: 'De licencia' }
const ROLES: Record<string, string> = { DIRECTOR: 'Director', AGENT: 'Asesor', MANAGER: 'Gerente' }
const LANGUAGES: Record<string, string> = { es: 'Español', en: 'Inglés', pt: 'Portugués', fr: 'Francés' }

export const OrganizationAdvisorDetail = () => {
  const { advisorId } = useParams()
  const { user, accessToken } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedPage = Number(searchParams.get('page') || 1)
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 10000) : 1
  const requestedStatus = searchParams.get('status')
  const status = isPropertyStatus(requestedStatus) ? propertyStatusValue(requestedStatus) : ''
  const orgId = user?.organizationId
  const canView = user?.roleInOrganization === 'DIRECTOR' && !!orgId
  const [contactError, setContactError] = useState('')
  const [contactBusy, setContactBusy] = useState(false)
  const contactPending = useRef(false)
  const query = useQuery({
    queryKey: ['organization-advisor', accessToken, orgId, advisorId, page, status],
    queryFn: () => organizationAPI.getAdvisor(accessToken!, orgId!, advisorId!, page, status),
    placeholderData: (previous, previousQuery) => previousQuery?.queryKey[1] === accessToken && previousQuery.queryKey[2] === orgId && previousQuery.queryKey[3] === advisorId ? previous : undefined,
    enabled: canView && !!accessToken && !!advisorId,
    retry: false,
  })
  const back = <Link className="agent-back" to="/organization/dashboard"><Icon name="back" />Mi inmobiliaria</Link>
  if (!canView) return <section className="agent-detail-page">{back}<div className="empty-panel"><h1>Acceso reservado al director</h1><p>Este detalle está disponible para el director de la inmobiliaria.</p></div></section>
  if (query.isPending) return <section className="agent-detail-page">{back}<div className="loading-panel" role="status">Cargando información del asesor…</div></section>
  if (query.isError || !query.data) return <section className="agent-detail-page">{back}<div className="empty-panel" role="alert"><h1>No pudimos cargar el asesor</h1><p>{getErrorMessage(query.error, 'El asesor no está disponible en tu organización.')}</p><button className="button button-secondary" onClick={() => query.refetch()}>Reintentar</button></div></section>
  const { advisor, properties, summary, pagination } = query.data
  const fullName = `${advisor.firstName} ${advisor.lastName}`
  const changePage = (value: number) => {
    setSearchParams(previous => { const next = new URLSearchParams(previous); if (value === 1) next.delete('page'); else next.set('page', String(value)); return next })
    document.getElementById('agent-properties-heading')?.focus()
  }
  const changeStatus = (value: string) => setSearchParams(previous => {
    const next = new URLSearchParams(previous)
    next.delete('page')
    if (value) next.set('status', value); else next.delete('status')
    return next
  })
  const contact = async () => {
    if (!accessToken || contactPending.current) return
    contactPending.current = true; setContactBusy(true); setContactError('')
    try {
      const conversation = await conversationsAPI.create(accessToken, [advisor.id])
      if (!conversation?.id) throw new Error('No pudimos abrir la conversación.')
      navigate(`/messages/${conversation.id}`)
    } catch (error) { setContactError(getErrorMessage(error, 'No pudimos abrir la conversación.')) }
    finally { contactPending.current = false; setContactBusy(false) }
  }
  return <div className="agent-detail-page">{back}
    <header className="agent-detail-heading"><div className="agent-detail-identity">
      {advisor.profileImage ? <img className="agent-profile-avatar" src={advisor.profileImage} alt={fullName} /> : <span className="agent-profile-avatar" aria-hidden="true">{advisor.firstName.slice(0, 1)}{advisor.lastName.slice(0, 1)}</span>}
      <div><p>Tu equipo</p><h1>{fullName}</h1><div className="agent-heading-badges"><span className="agent-badge agent-role"><Icon name="user" width="14" height="14" />{ROLES[advisor.role] || advisor.role}</span><span className={`agent-badge agent-status-${advisor.status.toLowerCase()}`}><span className="agent-status-dot" />{ADVISOR_STATUS[advisor.status] || advisor.status}</span>{advisor.isVerified && <span className="agent-verified"><Icon name="shield" width="15" height="15" />Perfil verificado</span>}</div></div>
    </div>
    {advisor.id !== user?.id && <div className="agent-heading-actions"><button type="button" className="button button-primary agent-contact-button" disabled={contactBusy} onClick={contact}><Icon name="message" />{contactBusy ? 'Abriendo…' : 'Conversar'}</button>{user && <WhatsAppContact phone={advisor.whatsappPhone} recipient={advisor.firstName} label="WhatsApp" withIcon context={{ kind: 'advisor', sender: `${user.firstName} ${user.lastName}` }} className="agent-contact-button agent-whatsapp-button" />}</div>}
    </header>
    {contactError && <p role="alert" className="form-error">{contactError}</p>}
    <div className="agent-detail-layout"><aside className="agent-profile-panel">
      <h2><Icon name="user" />Ficha del asesor</h2>
      <section className="agent-info-section"><h3><Icon name="phone" width="17" height="17" />Contacto</h3><dl><div><dt><Icon name="mail" width="15" height="15" />Correo electrónico</dt><dd><a href={`mailto:${encodeURIComponent(advisor.email)}`}>{advisor.email}</a></dd></div><div><dt><Icon name="phone" width="15" height="15" />Teléfono</dt><dd>{advisor.phone ? <a href={`tel:${advisor.phone.replace(/[^+\d]/g, '')}`}>{advisor.phone}</a> : 'No registrado'}</dd></div></dl></section>
      {advisor.bio && <section className="agent-info-section"><h3><Icon name="file" width="17" height="17" />Acerca del asesor</h3><p className="agent-profile-bio">{advisor.bio}</p></section>}
      <details className="agent-info-section agent-professional-details"><summary><Icon name="building" width="18" height="18" /><span>Información profesional</span><Icon name="chevronRight" width="16" height="16" /></summary><dl><div><dt>Experiencia</dt><dd>{advisor.yearsExperience == null ? 'No registrada' : `${advisor.yearsExperience} ${advisor.yearsExperience === 1 ? 'año' : 'años'}`}</dd></div><div><dt>Matrícula / licencia</dt><dd>{advisor.licenseNumber || 'No registrada'}</dd></div><div><dt>Idiomas</dt><dd>{advisor.language.length ? advisor.language.map(value => LANGUAGES[value] || value).join(', ') : 'No registrados'}</dd></div><div><dt>Valoraciones</dt><dd>{advisor.reviewCount ? `${Number(advisor.rating || 0).toFixed(1)} / 5 · ${advisor.reviewCount} valoraciones` : 'Sin valoraciones'}</dd></div><div><dt>Cuenta creada</dt><dd>{new Date(advisor.createdAt).toLocaleDateString('es-BO', { year: 'numeric', month: 'long', day: 'numeric' })}</dd></div></dl></details>
    </aside><main className="agent-properties-panel">
      <div className="agent-stats" role="group" aria-label="Filtrar propiedades por estado">{[
        { value: '', label: 'Propiedades', count: summary.total, icon: 'home' },
        { value: 'AVAILABLE', label: 'Disponibles', count: summary.available, icon: 'check' },
        { value: 'ARCHIVED', label: 'En pausa', count: summary.paused, icon: 'pause' },
        { value: 'UNDER_OFFER', label: 'Reservadas', count: summary.reserved, icon: 'calendar' },
        { value: 'SOLD', label: 'Cerradas', count: summary.closed, icon: 'lock' },
      ].map(({ value, label, count, icon }) => <button key={value} data-status={value || 'ALL'} type="button" aria-pressed={status === value} aria-controls="agent-properties-results"
        title={value ? `Ver propiedades en estado «${getPropertyStatusLabel(value)}»` : 'Ver todas las propiedades'} onClick={() => changeStatus(value)}>
        <span className="agent-stat-top"><Icon name={icon as IconName} width="19" height="19" /><strong>{count}</strong></span><span>{label}</span>
      </button>)}</div>
      <div className="agent-properties-heading"><h2 id="agent-properties-heading" tabIndex={-1}><Icon name="building" />Propiedades</h2><span aria-live="polite">{query.isPlaceholderData ? 'Buscando…' : `${pagination.total} ${pagination.total === 1 ? 'propiedad' : 'propiedades'}`}</span></div>
      <div id="agent-properties-results" aria-busy={query.isFetching}>
      {query.isPlaceholderData ? <div className="loading-panel" role="status">Filtrando propiedades…</div>
        : !properties.length ? <div className="agent-properties-empty"><Icon name="home" width="36" height="36" /><h3>{status ? `No hay propiedades en estado «${getPropertyStatusLabel(status)}»` : 'Aún no tiene propiedades en tu organización'}</h3>{status && <button className="button button-secondary" onClick={() => changeStatus('')}>Ver todos los estados</button>}</div>
        : <div className="agent-properties-grid">{properties.map(property => <section className="agent-property" key={property.id}><div className="agent-property-status" data-status={propertyStatusValue(property.status)}><span><i aria-hidden="true" />{getPropertyStatusLabel(property.status)}</span></div><PropertyCard {...property} price={Number(property.price)} bedrooms={property.bedrooms ?? undefined} bathrooms={property.bathrooms ?? undefined} areaSquareMeters={property.areaSquareMeters ?? undefined} /></section>)}</div>}
      {!query.isPlaceholderData && pagination.pages > 1 && <nav className="agent-pagination" aria-label="Páginas de propiedades"><button className="button button-secondary" disabled={pagination.page <= 1} onClick={() => changePage(pagination.page - 1)}><Icon name="back" width="17" height="17" />Anterior</button><span>Página {pagination.page} de {pagination.pages}</span><button className="button button-secondary" disabled={pagination.page >= pagination.pages} onClick={() => changePage(pagination.page + 1)}>Siguiente<Icon name="arrow" width="17" height="17" /></button></nav>}
      </div>
    </main></div>
  </div>
}
