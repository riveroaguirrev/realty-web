import './OrganizationDashboard.css'
import { Icon, IconName } from '@/components/ui/Icon'
import { Permission } from '@shared/types'
import { useEffect, useRef, useState } from 'react'
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

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!inviteEmail.trim() || !organization) {
      return
    }

    try {
      setLocalError('')
      const result = await sendInvite(organization.id, inviteEmail)
      setInviteCode(result.inviteCode || '')
      setInviteEmail('')
      setInviteSent(true)
      await refresh()
      setTimeout(() => setInviteSent(false), 5000)
    } catch (err) {
      setLocalError(Object.values(formErrors(err)).flat().join(' '))
    }
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
    return (
      <>
        <div className="page-surface flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No hay organización</h2>
            <p className="text-gray-600 mb-6">
              Necesitas crear o unirte a una inmobiliaria para acceder al dashboard
            </p>
            <button
              onClick={() => navigate('/organization/setup')}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
              Ir a Configuración
            </button>
          </div>
        </div>
      </>
    )
  }

  const roleLabel = (role?: string) => role === 'DIRECTOR' ? 'Director' : role === 'AGENT' ? 'Asesor' : role === 'ADMIN' ? 'Administrador' : role || 'Miembro'
  const stats: { label: string; count: number; icon: IconName; accent?: string }[] = organization.seats ? [
    { label: 'Cupos totales', count: organization.seats.limit, icon: 'building' },
    { label: 'Miembros', count: organization.seats.occupied, icon: 'team' },
    { label: 'Reservados', count: organization.seats.reserved, icon: 'user', accent: 'reserved' },
    { label: 'Disponibles', count: organization.seats.available, icon: 'check', accent: 'available' },
  ] : []
  const inviteForm = isAdmin && <form className="org-invite-form" onSubmit={handleSendInvite}>
    <div className="org-email-field"><Icon name="message" /><input id="org-invite-email" aria-label="Correo del nuevo asesor" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="Correo del asesor" /></div>
    <button type="submit" className="button button-primary" disabled={!inviteEmail || isLoading || organization.seats?.available === 0}>Enviar invitación</button>
  </form>
  const invitationList = <section className="org-panel org-invitations" id="org-invitations" aria-label="Invitaciones pendientes">
    <h2>Invitaciones pendientes <span className="org-count">{invites.length}</span></h2>
    {!invites.length && <p className="org-empty">No hay invitaciones pendientes.</p>}
    {invites.map(invite => <div key={invite.id} className="org-invite-row">
      <span className="org-invite-icon"><Icon name="message" /></span>
      <div className="org-invite-info"><strong>{invite.email}</strong><span>Vence: {new Date(invite.expiresAt).toLocaleDateString()}</span><details className="org-code"><summary>Ver código</summary><CopyableCode code={invite.code} /></details></div>
      <span className="org-badge org-pending"><i />Pendiente</span><span className="org-reserved-note">1 cupo reservado</span>
      <button className="button button-secondary" onClick={async () => {
        if (!accessToken) return
        try { await organizationAPI.cancelInvite(accessToken, organization.id, invite.id); await refresh() }
        catch (err) { setLocalError(Object.values(formErrors(err)).flat().join(' ')) }
      }}>Cancelar</button>
    </div>)}
  </section>
  return <div className="org-dashboard">
    <header className="org-heading"><span className="org-heading-icon"><Icon name="building" width="34" height="34" /></span><div><h1>Mi inmobiliaria</h1><p>{organization.name}</p></div><span className="org-badge org-heading-role"><Icon name="user" width="16" height="16" />{roleLabel(user?.roleInOrganization)}</span></header>
    {localError && <p role="alert" className="form-error">{localError}</p>}
    {error && <p role="alert" className="form-error">{error}</p>}
    <section className="org-panel org-stats" aria-label="Cupos de la sucursal">
      {stats.map(stat => <div className="org-stat" key={stat.label}><span className={`org-stat-icon ${stat.accent || ''}`}><Icon name={stat.icon} width="27" height="27" /></span><div><strong>{stat.count}</strong><span>{stat.label}</span></div></div>)}
    </section>
    <div className="org-layout">
      <aside className="org-panel org-identity"><span className="org-monogram">{organization.name.trim().slice(0,1).toUpperCase()}</span><h2>{organization.name}</h2>
        {organization.city && <p className="org-contact"><Icon name="pin" /><span>{organization.city}{organization.region && organization.region !== organization.city && `, ${organization.region}`}</span></p>}
        {organization.email && <p className="org-contact"><Icon name="message" /><span>{organization.email}</span></p>}
        {organization.phone && <p className="org-contact"><Icon name="user" /><span>{organization.phone}</span></p>}
        <div className="org-identity-role"><span className="org-badge"><Icon name="user" width="16" height="16" />{roleLabel(user?.roleInOrganization)}</span></div>
      </aside>
      <div className="org-main">
        <section className="org-panel org-team">
          <div className="org-team-heading"><h2>Tu equipo</h2>{isAdmin && <button className="button button-primary" onClick={() => document.getElementById('org-invite-email')?.focus()}><Icon name="team" />Invitar asesor</button>}</div>
          <div className="org-tabs" role="tablist" aria-label="Tu equipo"><button id="org-members-tab" role="tab" aria-selected={activeTab === 'members'} aria-controls="org-team-content" onClick={() => setActiveTab('members')}>Miembros <span className="org-count">{advisors.length}</span></button>{isAdmin && <button id="org-invites-tab" role="tab" aria-selected={activeTab === 'invites'} aria-controls="org-team-content" onClick={() => setActiveTab('invites')}>Invitaciones <span className="org-count">{invites.length}</span></button>}</div>
          {inviteForm}
          {inviteSent && inviteCode && <div className="org-success" role="status"><strong>Invitación creada</strong><p>Comparte este código con el asesor:</p><CopyableCode code={inviteCode} /></div>}
          <div id="org-team-content" role="tabpanel" aria-labelledby={activeTab === 'members' ? 'org-members-tab' : 'org-invites-tab'}>
            {activeTab === 'members' ? <div className="org-members">{!advisors.length ? <p className="org-empty">No hay miembros en la organización.</p> : advisors.map(advisor => <div key={advisor.id} className="org-member-row">
              {advisor.profileImage ? <img className="org-avatar" src={advisor.profileImage} alt={advisor.firstName} /> : <span className="org-avatar" aria-hidden="true">{advisor.firstName?.slice(0,1)}{advisor.lastName?.slice(0,1)}</span>}
              <div className="org-member-info">{isDirector ? <Link className="org-member-detail-link" to={`/organization/advisors/${advisor.id}`}><strong>{advisor.firstName} {advisor.lastName}</strong><span>Ver detalle <Icon name="arrow" width="15" height="15" /></span></Link> : <strong>{advisor.firstName} {advisor.lastName}</strong>}<span>{advisor.email}</span></div><span className="org-badge">{roleLabel(advisor.role)}</span>{advisor.id === user?.id && <span className="org-badge">Tú</span>}
              {advisor.id !== user?.id && <div className="org-member-actions">
                <button type="button" className="org-start-conversation" onClick={() => { void startConversation(advisor.id) }} disabled={!accessToken || !!startingConversation || removingAdvisor === advisor.id} aria-label={`Iniciar conversación con ${advisor.firstName} ${advisor.lastName}`}><Icon name="message" width="18" height="18" />{startingConversation === advisor.id ? 'Abriendo…' : 'Iniciar conversación'}</button>
                {isAdmin && advisor.role !== 'DIRECTOR' && <button type="button" className="org-remove" onClick={() => handleRemoveAdvisor(advisor.id)} disabled={removingAdvisor === advisor.id}><Icon name="trash" width="16" height="16" />{removingAdvisor === advisor.id ? 'Quitando…' : 'Quitar'}</button>}
              </div>}
            </div>)}</div> : invitationList}
          </div>
        </section>
        {isAdmin && activeTab === 'members' && invitationList}
      </div>
    </div>
  </div>
}
