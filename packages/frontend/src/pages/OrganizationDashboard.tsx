import './OrganizationDashboard.css'
import { Icon, IconName } from '@/components/ui/Icon'
import { Permission } from '@shared/types'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/hooks/useOrganization'
import { organizationAPI, OrganizationInvite } from '@/services/organization'
import { formErrors } from '@/utils/authFlow'
import { CopyableCode } from '@/components/ui/CopyableCode'
import { conversationsAPI } from '@/services/conversations'
import { getErrorMessage } from '@/utils/errorMessage'

export const OrganizationDashboard = () => {
  const navigate = useNavigate()
  const { user, accessToken } = useAuth()
  const {
    organization,
    advisors,
    isLoading,
    error,
    getOrganization,
    listAdvisors,
    sendInvite,
    removeAdvisor,
  } = useOrganization()

  const [activeTab, setActiveTab] = useState<'members' | 'invites'>('members')
  const [inviteEmail, setInviteEmail] = useState('')
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [cancelingInvite, setCancelingInvite] = useState<string | null>(null)
  const inviteInput = useRef<HTMLInputElement>(null)
  const invitePending = useRef(false)
  const cancelPending = useRef(false)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [inviteSent, setInviteSent] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [removingAdvisor, setRemovingAdvisor] = useState<string | null>(null)
  const [invites, setInvites] = useState<OrganizationInvite[]>([])
  const [localError, setLocalError] = useState('')
  const [startingConversation, setStartingConversation] = useState<string | null>(null)
  const conversationPending = useRef(false)
  const refresh = async () => {
    if (!user?.organizationId || !accessToken) return
    await getOrganization(user.organizationId)
    if (user.permissions?.includes(Permission.ORG_ADMIN)) setInvites(await organizationAPI.listInvites(accessToken, user.organizationId))
  }

  const isDirector = user?.roleInOrganization === 'DIRECTOR'
  const isAdmin = user?.permissions?.includes(Permission.ORG_ADMIN)

  useEffect(() => {
    if (user?.organizationId && accessToken) {
      getOrganization(user.organizationId).catch(() => {})
      listAdvisors(user.organizationId).catch(() => {})
      if (user.permissions?.includes(Permission.ORG_ADMIN)) {
        organizationAPI.listInvites(accessToken, user.organizationId).then(setInvites).catch(() => {})
      }
    }
  }, [user?.organizationId, accessToken, getOrganization])

  useEffect(() => {
    if (showInviteForm) inviteInput.current?.focus()
  }, [showInviteForm])
  const openInvite = () => { setActiveTab('invites'); setShowInviteForm(true); window.requestAnimationFrame(() => inviteInput.current?.focus()) }
  const navigateTabs = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!isAdmin || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index
    setActiveTab(next === 0 ? 'members' : 'invites')
    tabRefs.current[next]?.focus()
  }
  const handleCancelInvite = async (invite: OrganizationInvite) => {
    if (!accessToken || !organization || cancelPending.current) return
    cancelPending.current = true
    setCancelingInvite(invite.id)
    setLocalError('')
    try {
      await organizationAPI.cancelInvite(accessToken, organization.id, invite.id)
      if (invite.code === inviteCode) { setInviteSent(false); setInviteCode('') }
      await refresh()
    } catch (err) { setLocalError(Object.values(formErrors(err)).flat().join(' ')) }
    finally { cancelPending.current = false; setCancelingInvite(null) }
  }

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!inviteEmail.trim() || !organization || invitePending.current) {
      return
    }

    invitePending.current = true
    setInviteSent(false)
    try {
      setLocalError('')
      const result = await sendInvite(organization.id, inviteEmail)
      setInviteCode(result.inviteCode || '')
      setInviteEmail('')
      setInviteSent(true)
      await refresh()
    } catch (err) {
      setLocalError(Object.values(formErrors(err)).flat().join(' '))
    } finally { invitePending.current = false }
  }

  const handleRemoveAdvisor = async (advisorId: string) => {
    if (!organization || !window.confirm('¿Estás seguro de que quieres remover este asesor?')) {
      return
    }

    setRemovingAdvisor(advisorId)
    try {
      await removeAdvisor(organization.id, advisorId)
      await refresh()
    } catch (err) {
      setLocalError(Object.values(formErrors(err)).flat().join(' '))
    } finally {
      setRemovingAdvisor(null)
    }
  }

  const startConversation = async (advisorId: string) => {
    if (!accessToken || !user || advisorId === user.id || conversationPending.current) return
    conversationPending.current = true
    setStartingConversation(advisorId)
    setLocalError('')
    try {
      const conversation = await conversationsAPI.create(accessToken, [advisorId])
      if (!conversation?.id || typeof conversation.id !== 'string') throw new Error('No pudimos abrir la conversación. Inténtalo de nuevo.')
      navigate(`/messages/${conversation.id}`)
    } catch (err) {
      setLocalError(getErrorMessage(err, 'No pudimos abrir la conversación. Inténtalo de nuevo.'))
    } finally {
      conversationPending.current = false
      setStartingConversation(null)
    }
  }

  if (isLoading && !organization) return <div className="loading-panel" role="status">Cargando tu inmobiliaria…</div>
  if (error && !organization) return <div className="empty-panel" role="alert"><h3>No pudimos cargar tu inmobiliaria</h3><p>{error}</p><button className="button button-secondary" onClick={() => user?.organizationId && getOrganization(user.organizationId).catch(() => {})}>Reintentar</button></div>
  if (!organization) {
    return <div className="org-dashboard org-no-organization"><span className="org-empty-building"><Icon name="building" width="36" height="36" /></span><span className="eyebrow">TU EQUIPO, EN UN SOLO LUGAR</span><h1>Mi inmobiliaria</h1><p>Crea tu inmobiliaria o únete con una invitación.</p><button type="button" className="button button-primary" onClick={() => navigate('/organization/setup')}><Icon name="team" />Crear o unirme<Icon name="arrow" width="17" height="17" /></button></div>
  }

  const roleLabel = (role?: string) => role === 'DIRECTOR' ? 'Director' : role === 'AGENT' ? 'Asesor' : role === 'ADMIN' ? 'Administrador' : role || 'Miembro'
  const stats: { label: string; count: number; icon: IconName; accent?: string }[] = organization.seats ? [
    { label: 'Cupos totales', count: organization.seats.limit, icon: 'building' },
    { label: 'Miembros', count: organization.seats.occupied, icon: 'team' },
    { label: 'Reservados', count: organization.seats.reserved, icon: 'user', accent: 'reserved' },
    { label: 'Disponibles', count: organization.seats.available, icon: 'check', accent: 'available' },
  ] : []
  const inviteForm = isAdmin && showInviteForm && <section className="org-invite-composer" id="org-invite-composer" aria-label="Invitar asesor"><div className="org-composer-heading"><h3><Icon name="mail" />Invitar asesor</h3><button type="button" className="org-close-composer" disabled={isLoading} onClick={() => { setShowInviteForm(false); document.getElementById('org-open-invite')?.focus() }} aria-label="Cerrar formulario de invitación"><Icon name="close" width="18" height="18" /></button></div><form className="org-invite-form" onSubmit={handleSendInvite}>
    <div className="org-email-field"><Icon name="mail" /><input ref={inviteInput} disabled={isLoading} id="org-invite-email" aria-label="Correo del nuevo asesor" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="Correo del asesor" /></div>
    <button type="submit" className="button button-primary" disabled={!inviteEmail || isLoading || organization.seats?.available === 0}><Icon name="send" width="17" height="17" />{isLoading ? 'Enviando…' : 'Enviar invitación'}</button>
  </form>{organization.seats?.available === 0 && <p className="org-capacity-note"><Icon name="team" width="16" height="16" />No quedan cupos disponibles.</p>}</section>
  const invitationList = <section className="org-panel org-invitations" id="org-invitations" aria-label="Invitaciones pendientes">
    <h2><Icon name="mail" width="20" height="20" />Invitaciones pendientes <span className="org-count">{invites.length}</span></h2>
    {!invites.length && <div className="org-empty-state"><Icon name="mail" width="29" height="29" /><p>No hay invitaciones pendientes.</p></div>}
    {invites.map(invite => <div key={invite.id} className="org-invite-row">
      <span className="org-invite-icon"><Icon name="message" /></span>
      <div className="org-invite-info"><strong>{invite.email}</strong><span>Vence: {new Date(invite.expiresAt).toLocaleDateString()}</span><details className="org-code"><summary>Ver código</summary><CopyableCode code={invite.code} /></details></div>
      <span className="org-badge org-pending"><i />Pendiente</span><span className="org-reserved-note">1 cupo reservado</span>
      <button type="button" className="button button-secondary" disabled={!!cancelingInvite || isLoading} onClick={() => { void handleCancelInvite(invite) }}>{cancelingInvite === invite.id ? 'Cancelando…' : 'Cancelar'}</button>
    </div>)}
  </section>
  return <div className="org-dashboard">
    <header className="org-heading"><span className="org-heading-icon"><Icon name="building" width="34" height="34" /></span><div><h1>Mi inmobiliaria</h1><p>{organization.name}</p></div><span className="org-badge org-heading-role"><Icon name="user" width="16" height="16" />{roleLabel(user?.roleInOrganization)}</span></header>
    {localError && <p role="alert" className="form-error">{localError}</p>}
    {error && <p role="alert" className="form-error">{error}</p>}
    {stats.length > 0 && <section className="org-panel org-stats" aria-label="Cupos de la sucursal">
      {stats.map(stat => {
        const action = stat.label === 'Miembros' ? () => { setActiveTab('members'); document.getElementById('org-team-heading')?.scrollIntoView({block:'start',behavior:'auto'}) }
          : isAdmin && stat.label === 'Reservados' ? () => { setActiveTab('invites'); document.getElementById('org-team-heading')?.scrollIntoView({block:'start',behavior:'auto'}) }
          : isAdmin && stat.label === 'Disponibles' && stat.count > 0 ? openInvite : null
        const content = <><span className={`org-stat-icon ${stat.accent || ''}`}><Icon name={stat.icon} width="25" height="25" /></span><span className="org-stat-value"><strong>{stat.count}</strong><span>{stat.label}</span></span>{action && <Icon name="chevronRight" className="org-stat-arrow" width="15" height="15" />}</>
        return action ? <button type="button" className="org-stat org-stat-action" key={stat.label} onClick={action}>{content}</button> : <div className="org-stat" key={stat.label}>{content}</div>
      })}
    </section>}

    <div className="org-layout">
      <aside className="org-panel org-identity"><span className="org-monogram">{organization.name.trim().slice(0,1).toUpperCase()}</span><h2>{organization.name}</h2>
        {organization.city && <p className="org-contact"><Icon name="pin" /><span>{organization.city}{organization.region && organization.region !== organization.city && `, ${organization.region}`}</span></p>}
        {organization.email && <p className="org-contact"><Icon name="mail" /><a href={`mailto:${organization.email}`}>{organization.email}</a></p>}
        {organization.phone && <p className="org-contact"><Icon name="phone" /><a href={`tel:${organization.phone.replace(/[^+0-9]/g, '')}`}>{organization.phone}</a></p>}
      </aside>
      <div className="org-main">
        <section className="org-panel org-team">
          <div className="org-team-heading" id="org-team-heading"><h2><Icon name="team" />Tu equipo</h2>{isAdmin && <button type="button" id="org-open-invite" className="button button-primary" aria-expanded={showInviteForm} aria-controls="org-invite-composer" onClick={openInvite}><Icon name="plus" />Invitar asesor</button>}</div>
          <div className="org-tabs" role="tablist" aria-label="Tu equipo"><button type="button" ref={element => { tabRefs.current[0] = element }} id="org-members-tab" role="tab" tabIndex={activeTab === 'members' ? 0 : -1} aria-selected={activeTab === 'members'} aria-controls="org-team-content" onKeyDown={event => navigateTabs(event, 0)} onClick={() => setActiveTab('members')}><Icon name="team" width="18" height="18" />Miembros <span className="org-count">{advisors.length}</span></button>{isAdmin && <button type="button" ref={element => { tabRefs.current[1] = element }} id="org-invites-tab" role="tab" tabIndex={activeTab === 'invites' ? 0 : -1} aria-selected={activeTab === 'invites'} aria-controls="org-team-content" onKeyDown={event => navigateTabs(event, 1)} onClick={() => setActiveTab('invites')}><Icon name="mail" width="18" height="18" />Invitaciones <span className="org-count">{invites.length}</span></button>}</div>
          {inviteForm}
          {inviteSent && inviteCode && <div className="org-success" role="status"><strong>Invitación creada</strong><p>Código para unirse:</p><CopyableCode code={inviteCode} /></div>}
          <div id="org-team-content" role="tabpanel" aria-labelledby={activeTab === 'members' ? 'org-members-tab' : 'org-invites-tab'}>
            {activeTab === 'members' ? <div className="org-members">{!advisors.length ? <div className="org-empty-state"><Icon name="team" width="29" height="29" /><p>Tu equipo aparecerá aquí.</p></div> : advisors.map(advisor => <div key={advisor.id} className="org-member-row">
              {advisor.profileImage ? <img className="org-avatar" src={advisor.profileImage} alt={advisor.firstName} /> : <span className="org-avatar" aria-hidden="true">{advisor.firstName?.slice(0,1)}{advisor.lastName?.slice(0,1)}</span>}
              <div className="org-member-info">{isDirector ? <Link className="org-member-detail-link" to={`/organization/advisors/${advisor.id}`}><strong>{advisor.firstName} {advisor.lastName}</strong><span>Ver detalle <Icon name="arrow" width="15" height="15" /></span></Link> : <strong>{advisor.firstName} {advisor.lastName}</strong>}<span>{advisor.email}</span></div><span className="org-badge org-member-role" data-role={advisor.role}>{roleLabel(advisor.role)}</span>{advisor.id === user?.id && <span className="org-badge">Tú</span>}
              {advisor.id !== user?.id && <div className="org-member-actions">
                <button type="button" className="org-start-conversation" onClick={() => { void startConversation(advisor.id) }} disabled={!accessToken || !!startingConversation || removingAdvisor === advisor.id} aria-label={`Iniciar conversación con ${advisor.firstName} ${advisor.lastName}`}><Icon name="message" width="18" height="18" />{startingConversation === advisor.id ? 'Abriendo…' : 'Conversar'}</button>
                {isAdmin && advisor.role !== 'DIRECTOR' && <button type="button" className="org-remove" onClick={() => handleRemoveAdvisor(advisor.id)} disabled={removingAdvisor === advisor.id}><Icon name="trash" width="16" height="16" />{removingAdvisor === advisor.id ? 'Quitando…' : 'Quitar'}</button>}
              </div>}
            </div>)}</div> : invitationList}
          </div>
        </section>

      </div>
    </div>
  </div>
}
