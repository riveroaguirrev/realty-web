import { useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { organizationAPI } from '@/services/organization'
import { conversationsAPI } from '@/services/conversations'
import { getErrorMessage } from '@/utils/errorMessage'
import { PROPERTY_TYPES } from '@/utils/propertyPresentation'
import { PropertyCard } from '@/components/property/PropertyCard'
import { Icon } from '@/components/ui/Icon'
import { WhatsAppContact } from '@/components/ui/WhatsAppContact'
import './OrganizationAdvisorDetail.css'

const PROPERTY_STATUS: Record<string, string> = { AVAILABLE: 'Disponible', UNDER_OFFER: 'En negociación', SOLD: 'Vendido', RENT: 'Alquilado', ARCHIVED: 'Archivado' }
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
  const orgId = user?.organizationId
  const canView = user?.roleInOrganization === 'DIRECTOR' && !!orgId
  const [contactError, setContactError] = useState('')
  const [contactBusy, setContactBusy] = useState(false)
  const contactPending = useRef(false)
  const query = useQuery({
    queryKey: ['organization-advisor', accessToken, orgId, advisorId, page],
    queryFn: () => organizationAPI.getAdvisor(accessToken!, orgId!, advisorId!, page),
    enabled: canView && !!accessToken && !!advisorId,
    retry: false,
  })
  const back = <Link className="agent-back" to="/organization/dashboard"><Icon name="back" />Mi organización</Link>
  if (!canView) return <section className="agent-detail-page">{back}<div className="empty-panel"><h1>Acceso reservado al director</h1><p>Solo el director puede consultar el detalle de los miembros de su organización.</p></div></section>
  if (query.isPending) return <section className="agent-detail-page">{back}<div className="loading-panel" role="status">Cargando información del asesor…</div></section>
  if (query.isError || !query.data) return <section className="agent-detail-page">{back}<div className="empty-panel" role="alert"><h1>No pudimos cargar el asesor</h1><p>{getErrorMessage(query.error, 'El asesor no está disponible en tu organización.')}</p><button className="button button-secondary" onClick={() => query.refetch()}>Reintentar</button></div></section>
  const { advisor, properties, summary, pagination } = query.data
  const fullName = `${advisor.firstName} ${advisor.lastName}`
  const changePage = (value: number) => { setSearchParams(value === 1 ? {} : { page: String(value) }); document.getElementById('agent-properties-heading')?.focus() }
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
    <header className="agent-detail-heading"><div><p>Tu equipo</p><h1>{fullName}</h1></div><div className="agent-heading-badges"><span className="agent-badge">{ROLES[advisor.role] || advisor.role}</span><span className={`agent-badge agent-status-${advisor.status.toLowerCase()}`}>{ADVISOR_STATUS[advisor.status] || advisor.status}</span></div></header>
    <div className="agent-detail-layout"><aside className="agent-profile-panel">
      {advisor.profileImage ? <img className="agent-profile-avatar" src={advisor.profileImage} alt={fullName} /> : <span className="agent-profile-avatar" aria-hidden="true">{advisor.firstName.slice(0, 1)}{advisor.lastName.slice(0, 1)}</span>}
      <h2>{fullName}</h2>{advisor.isVerified && <span className="agent-verified"><Icon name="check" />Perfil verificado</span>}
      {advisor.bio && <p className="agent-profile-bio">{advisor.bio}</p>}
      <section className="agent-info-section"><h3>Contacto</h3><dl><div><dt>Correo electrónico</dt><dd><a href={`mailto:${encodeURIComponent(advisor.email)}`}>{advisor.email}</a></dd></div><div><dt>Teléfono</dt><dd>{advisor.phone ? <a href={`tel:${advisor.phone.replace(/[^+\d]/g, '')}`}>{advisor.phone}</a> : 'No registrado'}</dd></div></dl></section>
      <section className="agent-info-section"><h3>Información profesional</h3><dl><div><dt>Experiencia</dt><dd>{advisor.yearsExperience == null ? 'No registrada' : `${advisor.yearsExperience} ${advisor.yearsExperience === 1 ? 'año' : 'años'}`}</dd></div><div><dt>Matrícula / licencia</dt><dd>{advisor.licenseNumber || 'No registrada'}</dd></div><div><dt>Idiomas</dt><dd>{advisor.language.length ? advisor.language.map(value => LANGUAGES[value] || value).join(', ') : 'No registrados'}</dd></div><div><dt>Valoraciones</dt><dd>{advisor.reviewCount ? `${Number(advisor.rating || 0).toFixed(1)} / 5 · ${advisor.reviewCount} valoraciones` : 'Sin valoraciones'}</dd></div><div><dt>Cuenta creada</dt><dd>{new Date(advisor.createdAt).toLocaleDateString('es-BO', { year: 'numeric', month: 'long', day: 'numeric' })}</dd></div></dl>{advisor.specializations.length > 0 && <div className="agent-specializations">{advisor.specializations.map(value => <span className="agent-badge" key={value}>{PROPERTY_TYPES[value] || value}</span>)}</div>}</section>
      {advisor.id !== user?.id && <button className="button button-primary agent-contact-button" disabled={contactBusy} onClick={contact}><Icon name="message" />{contactBusy ? 'Abriendo…' : 'Iniciar conversación'}</button>}
      {user && advisor.id !== user.id && <WhatsAppContact phone={advisor.whatsappPhone} recipient={advisor.firstName}
        context={{ kind: 'advisor', sender: `${user.firstName} ${user.lastName}` }} className="agent-contact-button" />}
      {contactError && <p role="alert" className="form-error">{contactError}</p>}
    </aside><main className="agent-properties-panel">
      <div className="agent-stats" aria-label="Resumen de propiedades">{[['Propiedades', summary.total], ['Disponibles', summary.available], ['Vendidas / alquiladas', summary.closed], ['Archivadas', summary.archived]].map(([label, value]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
      <div className="agent-properties-heading"><h2 id="agent-properties-heading" tabIndex={-1}>Propiedades en tu organización</h2><span>{pagination.total} {pagination.total === 1 ? 'propiedad' : 'propiedades'}</span></div>
      {!properties.length ? <div className="agent-properties-empty"><Icon name="home" width="36" height="36" /><h3>{pagination.total ? 'No hay propiedades en esta página' : 'Aún no tiene propiedades en tu organización'}</h3>{pagination.total > 0 && <button className="button button-secondary" onClick={() => changePage(1)}>Ir a la primera página</button>}</div> : <div className="agent-properties-grid">{properties.map(property => <section className="agent-property" key={property.id}><div className="agent-property-status"><span>{PROPERTY_STATUS[property.status] || property.status}</span>{property.status === 'ARCHIVED' && <Icon name="file" width="16" height="16" />}</div><PropertyCard {...property} price={Number(property.price)} bedrooms={property.bedrooms ?? undefined} bathrooms={property.bathrooms ?? undefined} areaSquareMeters={property.areaSquareMeters ?? undefined} /></section>)}</div>}
      {pagination.pages > 1 && <nav className="agent-pagination" aria-label="Páginas de propiedades"><button className="button button-secondary" disabled={page <= 1} onClick={() => changePage(page - 1)}>Anterior</button><span>Página {page} de {pagination.pages}</span><button className="button button-secondary" disabled={page >= pagination.pages} onClick={() => changePage(page + 1)}>Siguiente</button></nav>}
    </main></div>
  </div>
}
