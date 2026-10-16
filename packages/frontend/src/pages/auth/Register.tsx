import { FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { UserRole } from '@shared/types'
import { registrationFormSchema } from '@shared/validation/auth'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { AuthField, FormError } from '@/components/ui/AuthField'
import { useAuth } from '@/hooks/useAuth'
import { authLink, formErrors, safeNext, savePending } from '@/utils/authFlow'
export function Register() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'), '/auth/profile')
  const { register, isLoading } = useAuth()
  const [data, setData] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', role: UserRole.ADVISOR })
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const change = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setData({ ...data, [event.target.name]: event.target.value })
    setErrors({ ...errors, [event.target.name]: [], _form: [] })
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    try {
      const { confirmPassword: _confirm, ...payload } = registrationFormSchema.parse(data)
      const result = await register(payload)
      if (result.status !== 'AUTHENTICATED') {
        savePending(result, next)
        navigate(authLink('/auth/verify', next))
      }
    } catch (error) { setErrors(formErrors(error)) }
  }
  return <AuthLayout title="Crea tu cuenta" description="Una cuenta personal para cada usuario.">
    <form noValidate onSubmit={submit} className="space-y-5">
      <FormError errors={errors} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AuthField label="Nombres" name="firstName" autoComplete="given-name" required value={data.firstName} onChange={change} error={errors.firstName} disabled={isLoading} />
        <AuthField label="Apellidos" name="lastName" autoComplete="family-name" required value={data.lastName} onChange={change} error={errors.lastName} disabled={isLoading} />
      </div>
      <AuthField label="Correo electrónico" name="email" type="email" autoComplete="email" required value={data.email} onChange={change} error={errors.email} disabled={isLoading} />
      <AuthField label="Contraseña" name="password" type="password" autoComplete="new-password" hint="Usa al menos 12 caracteres. Puedes usar una frase." required value={data.password} onChange={change} error={errors.password} disabled={isLoading} />
      <AuthField label="Confirmar contraseña" name="confirmPassword" type="password" autoComplete="new-password" required value={data.confirmPassword} onChange={change} error={errors.confirmPassword} disabled={isLoading} />
      <div><label htmlFor="role" className="block text-sm font-semibold mb-2">Tipo de usuario</label>
        <select id="role" name="role" value={data.role} onChange={change} disabled={isLoading} className="w-full border-2 rounded-lg p-3" aria-invalid={!!errors.role?.length} aria-describedby={errors.role?.length ? 'role-error' : undefined}>
          <option value={UserRole.ADVISOR}>Asesor inmobiliario</option><option value={UserRole.BUYER}>Comprador</option>
        </select>{errors.role?.length ? <p id="role-error" className="text-red-700">{errors.role.join(' ')}</p> : null}
      </div>
      <button className="button button-primary w-full" disabled={isLoading}>{isLoading ? 'Creando cuenta…' : 'Crear cuenta'}</button>
    </form>
    <p className="mt-6 text-center">¿Ya tienes cuenta? <Link to={authLink('/auth/login', next)} className="text-green-700 font-semibold">Inicia sesión</Link></p>
  </AuthLayout>
}
