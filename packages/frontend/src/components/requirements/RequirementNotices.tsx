import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { requirementNotifications, requirementError } from '@/services/requirements'
import './RequirementNotices.css'
import type { RequirementNotice } from '@/services/requirements'
import { Icon } from '@/components/ui/Icon'
function NoticeIdentity({ notice }: { notice: RequirementNotice }) {
  const [failed, setFailed] = useState(false)
  if (notice.kind !== 'message') return <span className="notice-identity notice-identity-requirement" aria-hidden="true"><Icon name="search" /></span>
  const name = notice.actor ? `${notice.actor.firstName} ${notice.actor.lastName}` : notice.title.replace(/^Mensaje de /, '')
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase()
  return <span className="notice-identity" aria-hidden="true">{notice.actor?.profileImage && !failed ? <img src={notice.actor.profileImage} alt="" onError={() => setFailed(true)} /> : initials}<span className="notice-type-badge"><Icon name="message" width="12" height="12" /></span></span>
}
function noticeTime(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (!Number.isFinite(seconds)) return ''
  if (seconds < 60) return 'Ahora'
  const formatter = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })
  if (seconds < 3600) return formatter.format(-Math.floor(seconds / 60), 'minute')
  if (seconds < 86400) return formatter.format(-Math.floor(seconds / 3600), 'hour')
  return formatter.format(-Math.floor(seconds / 86400), 'day')
}
export const RequirementNotices = () => {
  const { accessToken } = useAuth()
  const client = useQueryClient()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); triggerRef.current?.focus() }
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])
  const query = useQuery({ queryKey: ['requirement-notifications', accessToken], queryFn: () => requirementNotifications.list(accessToken!), enabled: !!accessToken, refetchInterval: 30000 })
  if (!accessToken) return null
  const notices = query.data?.data || []
  const markRead = async (id: string) => {
    try { await requirementNotifications.read(accessToken, id); await client.invalidateQueries({ queryKey: ['requirement-notifications'] }) }
    catch (err) { setError(requirementError(err)) }
  }
  return <div className="req-notices" ref={containerRef}>
    <button ref={triggerRef} type="button" className="icon-button req-notices-trigger" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(value => !value)} aria-label={`Notificaciones: ${notices.length}${notices.length === 50 ? ' o más' : ''} sin leer`} title="Notificaciones">
      <Icon name="bell" />
      {notices.length > 0 && <span className="req-notices-count" aria-hidden="true">{notices.length}{notices.length === 50 ? '+' : ''}</span>}
    </button>
    {open && <div id={panelId} className="req-notices-panel" role="region" aria-label="Notificaciones">
      <header className="notice-panel-heading"><strong>Notificaciones</strong>{notices.length > 0 && <span>{notices.length} sin leer</span>}</header>
      {query.isLoading && <p role="status">Cargando…</p>}
      {(error || query.isError) && <p role="alert">{error || requirementError(query.error)}</p>}
      {!query.isLoading && !query.isError && !notices.length && <section className="notice-empty"><span><Icon name="bell" width="26" height="26" /></span><strong>Estás al día</strong><p>No tienes avisos pendientes.</p></section>}
      {notices.map(n => <article key={n.id} className="notice-row">
        <Link className="notice-main" to={n.actionUrl} onClick={() => { setOpen(false); void markRead(n.id) }}>
          <NoticeIdentity notice={n} />
          <span className="notice-content"><strong>{n.title}</strong>{n.kind !== 'message' && <span className="notice-preview">{n.message}</span>}<time dateTime={n.createdAt} title={new Date(n.createdAt).toLocaleString('es-BO')}>{noticeTime(n.createdAt)}</time></span>
        </Link>
        <span className="notice-unread-dot" aria-label="Sin leer" />
        <button className="notice-read-button" type="button" aria-label={`Marcar ${n.title} como leído`} title="Marcar como leído" onClick={() => markRead(n.id)}><Icon name="check" width="17" height="17" /></button>
      </article>)}
    </div>}
  </div>
}
