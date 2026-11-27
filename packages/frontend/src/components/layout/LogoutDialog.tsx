import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@/components/ui/Icon'
import './LogoutDialog.css'

export const LogoutDialog = ({ onCancel, onConfirm }: {
  onCancel: () => void
  onConfirm: () => Promise<void>
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const pendingRef = useRef(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current!
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
    }
  }, [])

  const confirm = async () => {
    if (pendingRef.current) return
    pendingRef.current = true
    setPending(true)
    setError('')
    try { await onConfirm() }
    catch {
      setError('No pudimos completar la salida. Inténtalo otra vez.')
      pendingRef.current = false
      setPending(false)
    }
  }

  return createPortal(
    <dialog ref={dialogRef} className="logout-dialog" aria-labelledby="logout-title" aria-describedby="logout-description" aria-busy={pending} onCancel={event => {
      event.preventDefault()
      if (!pendingRef.current) onCancel()
    }}>
      <button type="button" className="logout-dialog-close" aria-label="Seguir en Realty" disabled={pending} onClick={onCancel}><Icon name="close" /></button>
      <div className="logout-dialog-symbol"><Icon name="logout" width="28" height="28" /></div>
      <span className="logout-dialog-label">TU CUENTA · REALTY</span>
      <h2 id="logout-title">¿Cerrar sesión?</h2>
      <p id="logout-description">Tendrás que volver a iniciar sesión para acceder a tu espacio.</p>
      {error && <p className="logout-dialog-error" role="alert">{error}</p>}
      <div className="logout-dialog-actions">
        <button type="button" className="logout-dialog-stay" autoFocus disabled={pending} onClick={onCancel}>Seguir aquí</button>
        <button type="button" className="logout-dialog-confirm" disabled={pending} onClick={() => { void confirm() }}>
          <Icon name="logout" width="18" height="18" />{pending ? 'Cerrando sesión…' : 'Sí, cerrar sesión'}
        </button>
      </div>
      <span className="logout-dialog-status" role="status">{pending ? 'Cerrando tu sesión. Un momento, por favor.' : ''}</span>
    </dialog>, document.body,
  )
}
