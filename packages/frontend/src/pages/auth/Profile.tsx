import { ChangeEvent, FormEvent, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { AuthField, FormError } from '@/components/ui/AuthField'
import { advisorProfileSchema, contactPhoneSchema, profileSchema } from '@shared/validation/auth'
import { formErrors } from '@/utils/authFlow'
import { AccountSecurity } from '@/components/auth/AccountSecurity'
import { Avatar } from '@/components/ui/Avatar'
export function Profile() {
  const { user, updateProfile, uploadProfilePhoto, isLoading } = useAuth()
  const [data, setData] = useState({ firstName: '', lastName: '', bio: '', phone: '' })
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [success, setSuccess] = useState(false)
  const [photoStatus, setPhotoStatus] = useState<'idle' | 'uploading' | 'saved'>('idle')
  const [photoError, setPhotoError] = useState('')
  useEffect(() => {
    if (!user) return
    setData({ firstName: user.firstName, lastName: user.lastName, bio: user.bio ?? '', phone: user.phone ?? '' })
  }, [user?.id])
  const isAdvisor = user?.role === 'ADVISOR'
  const hasContactPhone = contactPhoneSchema.safeParse(user?.phone).success
  const change = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target
    setData(current => ({ ...current, [name]: value }))
    setErrors(current => ({ ...current, [name]: [], _form: [] }))
    setSuccess(false)
  }
  const changePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setPhotoError('')
    setPhotoStatus('uploading')
    try {
      await uploadProfilePhoto(file)
      setPhotoStatus('saved')
    } catch (error) {
      setPhotoStatus('idle')
      setPhotoError(Object.values(formErrors(error)).flat().join(' '))
    }
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setErrors({}); setSuccess(false)
    try {
      const { phone, ...profile } = data
      const schema = isAdvisor ? advisorProfileSchema : profileSchema
      const payload = schema.parse({ ...profile, phone: phone === (user?.phone ?? '') ? undefined : phone })
      const saved = await updateProfile(payload)
      setData(current => ({ ...current, phone: saved.phone ?? '' }))
      setSuccess(true)
    } catch (error) { setErrors(formErrors(error)) }
  }
  return <div className="page-surface"><div className="max-w-2xl mx-auto space-y-6">
    <section className="bg-white shadow rounded-lg p-6">
      <h1 className="text-2xl font-bold mb-4">Mi perfil</h1>
      <div className="mb-6 flex flex-wrap items-start gap-4">
        <Avatar user={user} className="profile-avatar" />
        <div className="min-w-0 flex-1">
          <label htmlFor="profile-photo" className="mb-2 block text-sm font-semibold">Foto de perfil</label>
          <input id="profile-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={changePhoto}
            disabled={isLoading || photoStatus === 'uploading'} aria-describedby="profile-photo-help"
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-stone-100 file:px-3 file:py-2 file:font-medium" />
          <p id="profile-photo-help" className="mt-2 text-sm text-gray-600">JPG, PNG o WebP de hasta 4 MB.</p>
          {photoStatus === 'uploading' && <p role="status" className="text-sm">Subiendo foto…</p>}
          {photoStatus === 'saved' && <p role="status" className="text-sm text-green-700">Tu foto de perfil se actualizó.</p>}
          {photoError && <p role="alert" className="text-sm text-red-700">{photoError}</p>}
        </div>
      </div>
      <p className="mb-2"><strong>Correo:</strong> {user?.email}</p>
      <p className="mb-6"><strong>Tipo de cuenta:</strong> {user?.role === 'BUYER' ? 'Comprador' : 'Asesor inmobiliario'}</p>
      <form noValidate onSubmit={submit} className="space-y-5">
        <FormError errors={errors} />
        {success && <p role="status" className="text-green-700">Tu perfil se ha actualizado.</p>}
        <AuthField label="Nombres" name="firstName" autoComplete="given-name" value={data.firstName} onChange={change} error={errors.firstName} required disabled={isLoading} />
        <AuthField label="Apellidos" name="lastName" autoComplete="family-name" value={data.lastName} onChange={change} error={errors.lastName} required disabled={isLoading} />
        <AuthField label={isAdvisor ? 'Celular con WhatsApp' : 'Teléfono (opcional)'} name="phone" type="tel" autoComplete="tel" placeholder="+591 71234567"
          hint={isAdvisor && !hasContactPhone ? 'Agrega un celular con prefijo internacional para que puedan contactarte por WhatsApp.' : undefined}
          value={data.phone} onChange={change} error={errors.phone} required={isAdvisor && hasContactPhone} disabled={isLoading} />
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
