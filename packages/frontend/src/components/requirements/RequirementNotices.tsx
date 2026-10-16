import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { requirementNotifications, requirementError } from '@/services/requirements'
export const RequirementNotices = () => {
  const { accessToken } = useAuth()
  const client = useQueryClient()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const query = useQuery({ queryKey: ['requirement-notifications', accessToken], queryFn: () => requirementNotifications.list(accessToken!), enabled: !!accessToken, refetchInterval: 30000 })
  if (!accessToken) return null
  const notices = query.data?.data || []
  const markRead = async (id: string) => {
    try { await requirementNotifications.read(accessToken, id); await client.invalidateQueries({ queryKey: ['requirement-notifications'] }) }
    catch (err) { setError(requirementError(err)) }
  }
  return <div className="req-notices"><button className="button button-small" aria-expanded={open} onClick={() => setOpen(!open)} aria-label={`Avisos de requerimientos: ${notices.length} sin leer`}>Avisos{notices.length > 0 ? ` (${notices.length}${notices.length === 50 ? '+' : ''})` : ''}</button>{open && <div className="req-notices-panel"><strong>Nuevos requerimientos</strong>{query.isLoading && <p>Cargando…</p>}{(error || query.isError) && <p role="alert">{error || requirementError(query.error)}</p>}{!query.isLoading && !query.isError && !notices.length && <p>No tienes avisos pendientes.</p>}{notices.map(n => <div key={n.id}><Link to={n.actionUrl} onClick={() => { setOpen(false); void markRead(n.id) }}>{n.message}</Link><button aria-label="Marcar aviso como leído" onClick={() => markRead(n.id)}>✓</button></div>)}</div>}</div>
}
