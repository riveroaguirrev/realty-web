import { FormEvent, useEffect, useState } from 'react'
import { changeEmailSchema, changePasswordSchema, verifySchema } from '@shared/validation/auth'
import { AuthField, FormError } from '@/components/ui/AuthField'
import { useAuth } from '@/hooks/useAuth'
import { authAPI } from '@/services/auth'
import { acceptSession } from '@/services/authSession'
import { formErrors } from '@/utils/authFlow'
import { Icon } from '@/components/ui/Icon'

interface EmailProgress { challengeId: string; email: string; newEmail: string; userId: string; side: 'old' | 'new'; sentAt: number }
export function AccountSecurity({ emailRequest = 0 }: { emailRequest?: number }) {
  const { user, accessToken, getProfile } = useAuth()
  const [password, setPassword] = useState({ currentPassword: '', password: '', confirmPassword: '' })
  const [email, setEmail] = useState({ email: '', currentPassword: '' })
  const [progress, setProgress] = useState<EmailProgress | null>(() => {
    try {
      const cached = JSON.parse(sessionStorage.getItem('auth-email-change') ?? 'null')
      return cached?.userId === user?.id && Date.now() - cached.sentAt < 600000 ? cached : null
    } catch { return null }
  })
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string[]>>({})
  const [emailErrors, setEmailErrors] = useState<Record<string, string[]>>({})
  const [notice, setNotice] = useState('')
  const [expanded, setExpanded] = useState<'password' | 'email' | null>(progress ? 'email' : null)
  useEffect(() => { if (emailRequest > 0) setExpanded('email') }, [emailRequest])
  const saveProgress = (value: EmailProgress | null) => {
    setProgress(value)
    if (value) sessionStorage.setItem('auth-email-change', JSON.stringify(value))
    else sessionStorage.removeItem('auth-email-change')
  }
  const changePassword = async (event: FormEvent) => {
    event.preventDefault()
    if (!accessToken) return
    setBusy(true); setPasswordErrors({}); setNotice('')
    try {
      await acceptSession(await authAPI.changePassword(accessToken, changePasswordSchema.parse(password)))
      setPassword({ currentPassword: '', password: '', confirmPassword: '' }); setNotice('Contraseña actualizada. Las sesiones anteriores quedaron sin acceso.')
    } catch (error) { setPasswordErrors(formErrors(error)) }
    finally { setBusy(false) }
  }
  const changeEmail = async (event: FormEvent) => {
    event.preventDefault()
    if (!accessToken || !user) return
    setBusy(true); setEmailErrors({}); setNotice('')
    try {
      const result = await authAPI.changeEmail(accessToken, changeEmailSchema.parse(email))
      saveProgress({ ...result, userId: user.id, side: 'old', sentAt: Date.now() })
      setEmail({ email: '', currentPassword: '' })
    } catch (error) { setEmailErrors(formErrors(error)) }
    finally { setBusy(false) }
  }
  const verifyEmail = async (event: FormEvent) => {
    event.preventDefault()
    if (!accessToken || !progress) return
    setBusy(true); setEmailErrors({})
    try {
      const result = await authAPI.verify({
        purpose: 'email_change', challengeId: progress.challengeId,
        email: progress.side === 'old' ? progress.email : progress.newEmail, code: verifySchema.pick({ code: true }).parse({ code }).code,
      }, accessToken)
      setCode('')
      if (result.status === 'EMAIL_CHANGE_PENDING') saveProgress({ ...progress, side: progress.side === 'old' ? 'new' : 'old' })
      else {
        if (result.status === 'AUTHENTICATED') await acceptSession(result)
        await getProfile()
        saveProgress(null); setNotice('Tu correo electrónico se ha actualizado.')
      }
    } catch (error) { setEmailErrors(formErrors(error)) }
    finally { setBusy(false) }
  }
  const resend = async () => {
    if (!progress || !accessToken) return
    setBusy(true); setEmailErrors({})
    try {
      await authAPI.resend({ purpose: 'email_change', email: progress.email, challengeId: progress.challengeId }, accessToken)
      saveProgress({ ...progress, side: 'old', sentAt: Date.now() }); setNotice('Revisa ambos correos para continuar.')
    } catch (error) { setEmailErrors(formErrors(error)) }
    finally { setBusy(false) }
  }
  return <section className="account-security" aria-labelledby="account-security-heading">
    <div className="profile-section-heading"><span className="profile-section-icon"><Icon name="shield" /></span><div><h2 id="account-security-heading">Acceso y seguridad</h2></div></div>
    {notice && <p role="status" className="profile-feedback profile-feedback-success"><Icon name="check" />{notice}</p>}
    <div className="profile-security-item">
      <button type="button" className="profile-security-toggle" aria-expanded={expanded === 'password'} aria-controls="profile-password-panel" onClick={() => setExpanded(expanded === 'password' ? null : 'password')}>
        <span className="profile-security-icon"><Icon name="lock" /></span><span><strong>Contraseña</strong><small>Actualiza tu contraseña.</small></span><span className="profile-security-action">{expanded === 'password' ? 'Cerrar' : 'Cambiar'}<Icon name="chevronRight" /></span>
      </button>
      <div id="profile-password-panel" hidden={expanded !== 'password'} className="profile-security-content">
      <form noValidate onSubmit={changePassword} className="space-y-4" aria-label="Cambiar contraseña">
      <FormError errors={passwordErrors} />
      <AuthField id="password-current" name="currentPassword" label="Contraseña actual" type="password" autoComplete="current-password" value={password.currentPassword} onChange={(e) => setPassword({ ...password, currentPassword: e.target.value })} error={passwordErrors.currentPassword} disabled={busy} />
      <AuthField id="password-new" name="password" label="Nueva contraseña" type="password" autoComplete="new-password" hint="Al menos 12 caracteres." value={password.password} onChange={(e) => setPassword({ ...password, password: e.target.value })} error={passwordErrors.password} disabled={busy} />
      <AuthField id="password-confirm" name="confirmPassword" label="Confirmar nueva contraseña" type="password" autoComplete="new-password" value={password.confirmPassword} onChange={(e) => setPassword({ ...password, confirmPassword: e.target.value })} error={passwordErrors.confirmPassword} disabled={busy} />
      <button className="button button-primary" disabled={busy}>{busy ? 'Actualizando…' : 'Actualizar contraseña'}</button>
      </form></div>
    </div>
    <div className="profile-security-item">
      <button type="button" className="profile-security-toggle" aria-expanded={expanded === 'email'} aria-controls="profile-email-panel" onClick={() => setExpanded(expanded === 'email' ? null : 'email')}>
        <span className="profile-security-icon"><Icon name="mail" /></span><span><strong>Correo electrónico</strong><small>{user?.email}</small></span><span className="profile-security-action">{expanded === 'email' ? 'Cerrar' : progress ? 'Continuar' : 'Cambiar'}<Icon name="chevronRight" /></span>
      </button>
      <div id="profile-email-panel" hidden={expanded !== 'email'} className="profile-security-content">
      <FormError errors={emailErrors} />
      {progress ? <form noValidate onSubmit={verifyEmail} className="space-y-4" aria-label="Verificar cambio de correo">
        <p>Confirma el código recibido en <strong>{progress.side === 'old' ? progress.email : progress.newEmail}</strong>. Debes confirmar ambos correos; tu correo anterior sigue vigente hasta finalizar.</p>
        <AuthField label="Código de confirmación" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} error={emailErrors.code} disabled={busy} />
        <button className="button button-primary" disabled={busy}>{busy ? 'Verificando…' : 'Confirmar código'}</button>
        <button type="button" className="button button-secondary ml-2" disabled={busy} onClick={() => { void resend() }}>Reenviar códigos</button>
      </form> : <form noValidate onSubmit={changeEmail} className="space-y-4" aria-label="Cambiar correo electrónico">
        <p className="profile-security-help">Confirmaremos el cambio en ambos correos.</p>
        <AuthField label="Nuevo correo electrónico" name="email" type="email" autoComplete="email" value={email.email} onChange={(e) => setEmail({ ...email, email: e.target.value })} error={emailErrors.email} disabled={busy} />
        <AuthField id="email-current" label="Contraseña actual" name="currentPassword" type="password" autoComplete="current-password" value={email.currentPassword} onChange={(e) => setEmail({ ...email, currentPassword: e.target.value })} error={emailErrors.currentPassword} disabled={busy} />
        <button className="button button-primary" disabled={busy}>{busy ? 'Enviando…' : 'Solicitar cambio de correo'}</button>
      </form>}
      </div>
    </div>
  </section>
}
