import './Verify.css'
import { Icon } from '@/components/ui/Icon'
import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { RecoveryGrant } from '@shared/types'
import { verifySchema, passwordFormSchema } from '@shared/validation/auth'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { AuthField, FormError } from '@/components/ui/AuthField'
import { authAPI } from '@/services/auth'
import { acceptSession, clearSession } from '@/services/authSession'
import { authLink, clearPending, formErrors, readPending } from '@/utils/authFlow'
export function Verify() {
  const navigate = useNavigate()
  const [pending, setPending] = useState(readPending)
  const [code, setCode] = useState('')
  const [passwords, setPasswords] = useState({ password: '', confirmPassword: '' })
  const [grant, setGrant] = useState<RecoveryGrant | null>(null)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [now, setNow] = useState(Date.now())
  const [notice, setNotice] = useState('')
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer) }, [])
  const cooldown = Math.max(0, Math.ceil(((pending?.sentAt ?? 0) + 60000 - now) / 1000))
  const verify = async (event: FormEvent) => {
    event.preventDefault()
    if (!pending) return
    setBusy(true); setErrors({})
    try {
      const result = await authAPI.verify({ purpose: pending.purpose, email: pending.email, challengeId: pending.challengeId, code: verifySchema.pick({ code: true }).parse({ code }).code })
      setCode('')
      if (result.status === 'PASSWORD_RESET_REQUIRED') setGrant(result)
      else if (result.status === 'AUTHENTICATED') {
        await acceptSession(result); clearPending(); navigate(pending.next, { replace: true })
      }
    } catch (error) { setErrors(formErrors(error)) }
    finally { setBusy(false) }
  }
  const resend = async () => {
    if (!pending) return
    setBusy(true); setErrors({})
    try {
      await authAPI.resend({ purpose: pending.purpose, email: pending.email, challengeId: pending.challengeId })
      const updated = { ...pending, sentAt: Date.now() }
      setPending(updated); sessionStorage.setItem('auth-pending', JSON.stringify(updated)); setNotice('Solicitud de reenvío realizada.')
    } catch (error) { setErrors(formErrors(error)) }
    finally { setBusy(false) }
  }
  const reset = async (event: FormEvent) => {
    event.preventDefault()
    if (!grant || !pending) return
    setBusy(true); setErrors({})
    try {
      await authAPI.resetPassword({ ...grant, ...passwordFormSchema.parse(passwords) })
      await clearSession(); clearPending()
      navigate(authLink('/auth/login', pending.next) + '&reset=1', { replace: true })
    } catch (error) { setErrors(formErrors(error)) }
    finally { setBusy(false) }
  }
  if (!pending) return <AuthLayout variant="verification" title="Verifica tu correo" description="Inicia sesión o regístrate para recibir tu código."><Link className="button button-primary" to="/auth/login">Ir al acceso</Link></AuthLayout>
  return <AuthLayout variant="verification" title={grant ? 'Elige tu nueva contraseña' : pending.purpose === 'device' ? 'Autoriza este navegador' : 'Verifica tu correo'}
    description={grant ? 'Confirma tu nueva contraseña.' : ''}>
    {!grant && <div className="verify-recipient"><p>Introduce el código enviado a</p><strong>{pending.email}</strong></div>}
    {pending.purpose === 'device' && !grant && <p className="verify-device-note">Al continuar, se cerrará tu sesión anterior.</p>}
    <FormError errors={grant ? errors : Object.fromEntries(Object.entries(errors).filter(([key]) => key !== 'code'))} />
    {notice && <p role="status" className="verify-notice"><Icon name="check" width="16" height="16" />{notice}</p>}
    {grant ? <form noValidate onSubmit={reset} className="space-y-5">
      <AuthField label="Nueva contraseña" name="password" type="password" autoComplete="new-password" value={passwords.password} onChange={(e) => setPasswords({ ...passwords, password: e.target.value })} error={errors.password} hint="Al menos 12 caracteres." disabled={busy} />
      <AuthField label="Confirmar contraseña" name="confirmPassword" type="password" autoComplete="new-password" value={passwords.confirmPassword} onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })} error={errors.confirmPassword} disabled={busy} />
      <button className="button button-primary w-full" disabled={busy}>Guardar nueva contraseña</button>
    </form> : <form noValidate onSubmit={verify} className="verify-code-form">
      <div className="verify-otp-field"><label htmlFor="verify-code">Código de 6 dígitos</label><div className={`verify-otp${errors.code?.length ? ' has-error' : ''}`}>
        <div className="verify-otp-slots" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <span key={index} className={`${code[index] ? 'is-filled' : ''}${index === Math.min(code.length, 5) ? ' is-current' : ''}`}>{code[index] || ''}</span>)}</div>
        <input id="verify-code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} onPaste={event => { event.preventDefault(); setCode(event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)) }} required disabled={busy} aria-invalid={!!errors.code?.length} aria-describedby={errors.code?.length ? 'verify-code-error verify-code-hint' : 'verify-code-hint'} />
      </div>{errors.code?.length && <p id="verify-code-error" className="verify-code-error" role="alert">{errors.code.join(' ')}</p>}<p id="verify-code-hint" className="verify-code-hint">Válido por 10 minutos · Puedes pegar el código</p></div>
      <button className="button button-primary w-full verify-submit" disabled={busy}>{busy ? 'Verificando…' : 'Verificar correo'}</button>
      <div className="verify-resend"><span>¿No recibiste el código?</span><button type="button" disabled={busy || cooldown > 0} onClick={() => { void resend() }}>{cooldown ? `Reenviar en ${cooldown} s` : 'Reenviar código'}</button></div>
      <details className="verify-help"><summary><span>¿Necesitas ayuda?</span><svg className="verify-help-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></summary><p>Revisa spam y confirma que el correo sea correcto. Si cambias de cuenta, vuelve al acceso.</p></details>
    </form>}
    <Link to={authLink('/auth/login', pending.next)} className="verify-back"><Icon name="back" width="16" height="16" />Volver al acceso</Link>
  </AuthLayout>
}
