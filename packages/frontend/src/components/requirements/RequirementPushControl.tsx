import { useEffect, useState } from 'react'
import { requirementNotifications, requirementError } from '@/services/requirements'
export const RequirementPushControl = ({ token }: { token: string }) => {
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (!message || failed) return
    const timer = window.setTimeout(() => setMessage(''), 3500)
    return () => window.clearTimeout(timer)
  }, [message, failed])
  useEffect(() => {
    let active = true
    if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistration('/requirements-sw.js').then(r => r?.pushManager.getSubscription()).then(s => { if (active) setEnabled(!!s) }).catch(() => {})
    return () => { active = false }
  }, [token])
  const toggle = async () => {
    setBusy(true); setMessage(''); setFailed(false)
    try {
      if (enabled) await requirementNotifications.disable(token)
      else await requirementNotifications.enable(token)
      setEnabled(!enabled)
      setMessage(enabled ? 'Avisos desactivados' : 'Avisos activados')
    } catch (error) { setFailed(true); setMessage(requirementError(error)) } finally { setBusy(false) }
  }
  return <div className="req-push-compact"><span>Avisos</span><button type="button" className="req-push-switch" role="switch" aria-checked={enabled} aria-label="Avisos de nuevos requerimientos" disabled={busy} onClick={toggle}><span /></button>{busy && <small role="status">Actualizando…</small>}{message && <p className={failed ? 'req-push-feedback is-error' : 'req-push-feedback'} role={failed ? 'alert' : 'status'}>{message}</p>}</div>
}
