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
      setPending(updated); sessionStorage.setItem('auth-pending', JSON.stringify(updated)); setNotice('Si la cuenta corresponde, recibirás un nuevo código.')
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
  if (!pending) return <AuthLayout title="Verifica tu correo" description="Inicia el registro o solicita un código para continuar."><Link className="button button-primary" to="/auth/login">Ir al acceso</Link></AuthLayout>
  return <AuthLayout title={grant ? 'Elige tu nueva contraseña' : pending.purpose === 'device' ? 'Autoriza este navegador' : 'Verifica tu correo'}
    description={grant ? 'Confirma tu nueva contraseña para recuperar el acceso.' : 'Escribe el código de 6 dígitos para ' + pending.email + '. Vence en 10 minutos.'}>
    {pending.purpose === 'device' && !grant && <p className="mb-5 text-gray-600">Al confirmar, tu sesión anterior dejará de tener acceso.</p>}
    <FormError errors={errors} />
    {notice && <p role="status" className="my-3 text-green-700">{notice}</p>}
    {grant ? <form noValidate onSubmit={reset} className="space-y-5">
      <AuthField label="Nueva contraseña" name="password" type="password" autoComplete="new-password" value={passwords.password} onChange={(e) => setPasswords({ ...passwords, password: e.target.value })} error={errors.password} hint="Al menos 12 caracteres." disabled={busy} />
      <AuthField label="Confirmar contraseña" name="confirmPassword" type="password" autoComplete="new-password" value={passwords.confirmPassword} onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })} error={errors.confirmPassword} disabled={busy} />
      <button className="button button-primary w-full" disabled={busy}>Guardar nueva contraseña</button>
    </form> : <form noValidate onSubmit={verify} className="space-y-5">
      <AuthField label="Código de verificación" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} error={errors.code} required disabled={busy} />
      <button className="button button-primary w-full" disabled={busy}>{busy ? 'Verificando…' : 'Verificar código'}</button>
      <button type="button" className="button button-secondary w-full" disabled={busy || cooldown > 0} onClick={() => { void resend() }}>{cooldown ? 'Reenviar en ' + cooldown + ' s' : 'Reenviar código'}</button>
    </form>}
    <Link to={authLink('/auth/login', pending.next)} className="block mt-6 text-green-700">Volver al acceso</Link>
  </AuthLayout>
}
