import { FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { loginSchema } from '@shared/validation/auth'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { AuthField, FormError } from '@/components/ui/AuthField'
import { useAuth } from '@/hooks/useAuth'
import { authLink, formErrors, safeNext, savePending } from '@/utils/authFlow'
export function Login() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const { login, isLoading, error } = useAuth()
  const [data, setData] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    try {
      const result = await login(loginSchema.parse(data))
      if (result.status === 'AUTHENTICATED') navigate(next, { replace: true })
      else {
        savePending(result, next)
        if (result.status === 'EMAIL_VERIFICATION_REQUIRED') {
          const pending = JSON.parse(sessionStorage.getItem('auth-pending')!)
          sessionStorage.setItem('auth-pending', JSON.stringify({ ...pending, sentAt: 0 }))
        }
        navigate(authLink('/auth/verify', next))
      }
    } catch (failure) { setErrors(formErrors(failure)) }
  }
  const change = (event: React.ChangeEvent<HTMLInputElement>) => { setData({ ...data, [event.target.name]: event.target.value }); setErrors({ ...errors, [event.target.name]: [], _form: [] }) }
  return <AuthLayout title="Inicia sesión" description="Continúa en tu espacio inmobiliario.">
    {params.get('reset') === '1' && <p role="status" className="bg-green-50 p-4 mb-4">Contraseña actualizada. Inicia sesión con tu nueva contraseña.</p>}
    <form noValidate onSubmit={submit} className="space-y-5">
      <FormError errors={errors._form?.length ? errors : { ...errors, _form: error ? [error] : [] }} />
      <AuthField label="Correo electrónico" name="email" type="email" autoComplete="email" required value={data.email} onChange={change} error={errors.email} disabled={isLoading} />
      <AuthField label="Contraseña" name="password" type="password" autoComplete="current-password" required value={data.password} onChange={change} error={errors.password} disabled={isLoading} />
      <Link to={authLink('/auth/forgot-password', next)} className="block text-green-700">Olvidé mi contraseña</Link>
      <button className="button button-primary w-full" disabled={isLoading}>{isLoading ? 'Iniciando sesión…' : 'Iniciar sesión'}</button>
    </form>
    <p className="mt-6 text-center">¿No tienes cuenta? <Link to={authLink('/auth/register', next)} className="text-green-700 font-semibold">Crear cuenta</Link></p>
  </AuthLayout>
}
