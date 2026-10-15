import { FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { loginSchema } from '@shared/validation/auth'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { AuthField, FormError } from '@/components/ui/AuthField'
import { authAPI } from '@/services/auth'
import { authLink, formErrors, safeNext } from '@/utils/authFlow'
export function ForgotPassword() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setErrors({})
    try {
      const normalized = loginSchema.pick({ email: true }).parse({ email }).email
      await authAPI.recovery(normalized)
      sessionStorage.setItem('auth-pending', JSON.stringify({ purpose: 'recovery', email: normalized, next, sentAt: Date.now() }))
      navigate(authLink('/auth/verify', next))
    } catch (error) { setErrors(formErrors(error)) }
    finally { setBusy(false) }
  }
  return <AuthLayout title="Recupera tu contraseña" description="Si tu cuenta corresponde, enviaremos un código a tu correo.">
    <form noValidate onSubmit={submit} className="space-y-5">
      <FormError errors={errors} />
      <AuthField label="Correo electrónico" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} required disabled={busy} />
      <button className="button button-primary w-full" disabled={busy}>{busy ? 'Solicitando código…' : 'Solicitar código'}</button>
    </form><Link to={authLink('/auth/login', next)} className="block mt-6 text-green-700">Volver al acceso</Link>
  </AuthLayout>
}
