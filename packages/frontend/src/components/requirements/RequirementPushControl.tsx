import { useEffect, useState } from 'react'
import { requirementNotifications, requirementError } from '@/services/requirements'
export const RequirementPushControl = ({ token }: { token: string }) => {
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => {
    let active = true
    if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistration('/requirements-sw.js').then(r => r?.pushManager.getSubscription()).then(s => { if (active) setEnabled(!!s) }).catch(() => {})
    return () => { active = false }
  }, [token])
  const toggle = async () => {
    setBusy(true); setMessage('')
    try {
      if (enabled) await requirementNotifications.disable(token)
      else await requirementNotifications.enable(token)
      setEnabled(!enabled)
      setMessage(enabled ? 'Avisos push desactivados en este dispositivo.' : 'Recibirás avisos de nuevos requerimientos en este dispositivo.')
    } catch (error) { setMessage(requirementError(error)) } finally { setBusy(false) }
  }
  return <div className="req-push"><div><strong>Entérate de las nuevas búsquedas</strong><p>Activa los avisos para ofrecer tus inmuebles cuando alguien los necesite.</p>{message && <p role="status">{message}</p>}</div><button className="button" disabled={busy} onClick={toggle}>{busy ? 'Actualizando…' : enabled ? 'Desactivar avisos push' : 'Activar avisos push'}</button></div>
}
