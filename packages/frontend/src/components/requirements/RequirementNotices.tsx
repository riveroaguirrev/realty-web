import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { requirementNotifications, requirementError } from '@/services/requirements'
import { Icon } from '@/components/ui/Icon'
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
    {open && <div id={panelId} className="req-notices-panel" role="region" aria-label="Notificaciones de requerimientos">
      <strong>Nuevos requerimientos</strong>
      {query.isLoading && <p role="status">Cargando…</p>}
      {(error || query.isError) && <p role="alert">{error || requirementError(query.error)}</p>}
      {!query.isLoading && !query.isError && !notices.length && <p>No tienes avisos pendientes.</p>}
      {notices.map(n => <div key={n.id}>
        <Link to={n.actionUrl} onClick={() => { setOpen(false); void markRead(n.id) }}>{n.message}</Link>
        <button type="button" aria-label="Marcar aviso como leído" title="Marcar como leído" onClick={() => markRead(n.id)}><Icon name="check" /></button>
      </div>)}
    </div>}
  </div>
}
