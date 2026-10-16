import { FormEvent, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { AuthField, FormError } from '@/components/ui/AuthField'
import { profileSchema } from '@shared/validation/auth'
import { formErrors } from '@/utils/authFlow'
import { AccountSecurity } from '@/components/auth/AccountSecurity'
export function Profile() {
  const { user, updateProfile, isLoading } = useAuth()
  const [data, setData] = useState({ firstName: '', lastName: '', bio: '', prefix: '', number: '' })
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [success, setSuccess] = useState(false)
  useEffect(() => {
    if (!user) return
    const twoDigit = new Set('20 27 30 31 32 33 34 36 39 40 41 43 44 45 46 47 48 49 51 52 53 54 55 56 57 58 60 61 62 63 64 65 66 81 82 84 86 90 91 92 93 94 95 98'.split(' '))
    const phone = user.phone ?? ''
    const prefixLength = /^\+[17]/.test(phone) ? 2 : twoDigit.has(phone.slice(1, 3)) ? 3 : 4
    const parts = phone.startsWith('+') ? [phone, phone.slice(0, prefixLength), phone.slice(prefixLength)] : null
    setData({ firstName: user.firstName, lastName: user.lastName, bio: user.bio ?? '', prefix: parts?.[1] ?? '', number: parts?.[2] ?? user.phone ?? '' })
  }, [user?.id])
  const change = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setData({ ...data, [event.target.name]: event.target.value }); setSuccess(false) }
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setErrors({}); setSuccess(false)
    try {
      const payload = profileSchema.parse({ firstName: data.firstName, lastName: data.lastName, bio: data.bio, phone: (data.prefix + data.number).replace(/\s/g, '') })
      await updateProfile(payload); setSuccess(true)
    } catch (error) { setErrors(formErrors(error)) }
  }
  return <div className="page-surface"><div className="max-w-2xl mx-auto space-y-6">
    <section className="bg-white shadow rounded-lg p-6">
      <h1 className="text-2xl font-bold mb-4">Mi perfil</h1>
      <p className="mb-2"><strong>Correo:</strong> {user?.email}</p>
      <p className="mb-6"><strong>Tipo de cuenta:</strong> {user?.role === 'BUYER' ? 'Comprador' : 'Asesor inmobiliario'}</p>
      <form noValidate onSubmit={submit} className="space-y-5">
        <FormError errors={errors} />
        {success && <p role="status" className="text-green-700">Tu perfil se ha actualizado.</p>}
        <AuthField label="Nombres" name="firstName" autoComplete="given-name" value={data.firstName} onChange={change} error={errors.firstName} required disabled={isLoading} />
        <AuthField label="Apellidos" name="lastName" autoComplete="family-name" value={data.lastName} onChange={change} error={errors.lastName} required disabled={isLoading} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <AuthField label="Prefijo internacional" name="prefix" type="tel" autoComplete="tel-country-code" placeholder="+591" value={data.prefix} onChange={change} error={errors.phone} disabled={isLoading} />
          <div className="sm:col-span-2"><AuthField label="Teléfono (opcional)" name="number" type="tel" autoComplete="tel-national" value={data.number} onChange={change} disabled={isLoading} /></div>
        </div>
        <div><label htmlFor="bio" className="block text-sm font-semibold mb-2">Acerca de ti (opcional)</label>
          <textarea id="bio" name="bio" value={data.bio} onChange={change} rows={4} className="w-full border-2 rounded-lg p-3" disabled={isLoading} aria-invalid={!!errors.bio?.length} aria-describedby={errors.bio?.length ? 'bio-error' : undefined} />
          {errors.bio?.length ? <p id="bio-error" className="text-red-700">{errors.bio.join(' ')}</p> : null}
        </div>
        <button className="button button-primary w-full" disabled={isLoading}>{isLoading ? 'Guardando…' : 'Guardar cambios'}</button>
      </form>
    </section>
    <AccountSecurity />
  </div></div>
}
