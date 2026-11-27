import { ChangeEvent, FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react'
import type { User } from '@shared/types'
import { useAuth } from '@/hooks/useAuth'
import { AuthField, FormError } from '@/components/ui/AuthField'
import { advisorProfileSchema, contactPhoneSchema, profileSchema } from '@shared/validation/auth'
import { formErrors } from '@/utils/authFlow'
import { AccountSecurity } from '@/components/auth/AccountSecurity'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import './Profile.css'

const profileData = (user: User | null) => ({
  firstName: user?.firstName ?? '', lastName: user?.lastName ?? '', bio: user?.bio ?? '', phone: user?.phone ?? '',
})
type ProfileTab = 'personal' | 'security'

export function Profile() {
  const { user, updateProfile, uploadProfilePhoto, isLoading } = useAuth()
  const [data, setData] = useState(() => profileData(user))
  const [savedData, setSavedData] = useState(() => profileData(user))
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [success, setSuccess] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<ProfileTab>('personal')
  const [activeSection, setActiveSection] = useState('firstName')
  const [emailRequest, setEmailRequest] = useState(0)
  const [photoStatus, setPhotoStatus] = useState<'idle' | 'uploading' | 'saved'>('idle')
  const [photoError, setPhotoError] = useState('')
  const [photoPreview, setPhotoPreview] = useState<string>()
  const photoInput = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const focusErrors = useRef(false)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    setData(profileData(user))
    setSavedData(profileData(user))
    setErrors({})
    setSuccess(false)
    setPhotoStatus('idle')
    setPhotoError('')
    // A photo or email update must not overwrite an unsaved profile draft.
  }, [user?.id])
  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview) }, [photoPreview])
  useEffect(() => {
    if (focusErrors.current) {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      focusErrors.current = false
    }
  }, [errors])

  const isAdvisor = user?.role === 'ADVISOR'
  const hasContactPhone = contactPhoneSchema.safeParse(user?.phone).success
  const hasChanges = (Object.keys(data) as (keyof typeof data)[]).some(key => data[key] !== savedData[key])
  const roleLabel = !isAdvisor ? 'Comprador' : user?.roleInOrganization === 'DIRECTOR' ? 'Director'
    : user?.roleInOrganization === 'MANAGER' ? 'Broker' : 'Asesor inmobiliario'
  const fullName = `${data.firstName.trim()} ${data.lastName.trim()}`.trim() || 'Tu nombre'
  const previewUser = user ? { ...user, ...data, profileImage: photoPreview ?? user.profileImage } : null
  const busy = isLoading || photoStatus === 'uploading'

  const change = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target
    setData(current => ({ ...current, [name]: value }))
    setErrors(current => ({ ...current, [name]: [], _form: [] }))
    setSuccess(false)
  }
  const discard = () => {
    setData(savedData)
    setErrors({})
    setSuccess(false)
  }
  const changePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || busy) return
    setPhotoError('')
    setPhotoStatus('idle')
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoError('Elige una imagen JPG, PNG o WebP.')
      return
    }
    if (file.size > 4 * 1024 * 1024) {
      setPhotoError('La foto debe pesar 4 MB o menos.')
      return
    }
    setPhotoPreview(URL.createObjectURL(file))
    setPhotoStatus('uploading')
    try {
      await uploadProfilePhoto(file)
      setPhotoStatus('saved')
    } catch (error) {
      setPhotoStatus('idle')
      setPhotoError(Object.values(formErrors(error)).flat().join(' '))
    } finally { setPhotoPreview(undefined) }
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy || !hasChanges) return
    setErrors({}); setSuccess(false)
    try {
      const { phone, ...profile } = data
      const schema = isAdvisor ? advisorProfileSchema : profileSchema
      const payload = schema.parse({ ...profile, phone: phone === (user?.phone ?? '') ? undefined : phone })
      setSaving(true)
      const saved = profileData(await updateProfile(payload))
      setData(saved)
      setSavedData(saved)
      setSuccess(true)
    } catch (error) { focusErrors.current = true; setErrors(formErrors(error)) }
    finally { setSaving(false) }
  }
  const navigateTabs = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index
    setActiveTab(next === 0 ? 'personal' : 'security')
    tabRefs.current[next]?.focus()
  }
  const openSecurity = () => {
    setEmailRequest(current => current + 1)
    setActiveTab('security')
    tabRefs.current[1]?.focus()
  }
  const focusField = (name: 'firstName' | 'phone' | 'bio') => {
    setActiveTab('personal')
    setActiveSection(name)
    window.requestAnimationFrame(() => {
      const input = formRef.current?.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`)
      input?.focus({ preventScroll: true })
      input?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' })
    })
  }
  const focusPhone = () => focusField('phone')

  return <div className="page-surface profile-page">
    <header className="profile-page-heading">
      <p className="eyebrow">TU CUENTA</p>
      <h1>Mi perfil<span aria-hidden="true">.</span></h1>
      <p>Edita tu información y revisa cómo se ve.</p>
    </header>

    <div className="profile-tabs" role="tablist" aria-label="Configuración de perfil">
      {([{ id: 'personal', label: 'Datos personales', icon: 'user' }, { id: 'security', label: 'Seguridad', icon: 'shield' }] as const).map((item, index) =>
        <button key={item.id} ref={element => { tabRefs.current[index] = element }} id={`profile-tab-${item.id}`} type="button" role="tab"
          aria-selected={activeTab === item.id} aria-controls={`profile-panel-${item.id}`} tabIndex={activeTab === item.id ? 0 : -1}
          onClick={() => setActiveTab(item.id)} onKeyDown={event => navigateTabs(event, index)}>
          <Icon name={item.icon} />{item.label}{item.id === 'personal' && hasChanges && <span className="profile-draft-dot" aria-label="Cambios sin guardar" />}
        </button>)}
    </div>

    <div id="profile-panel-personal" role="tabpanel" aria-labelledby="profile-tab-personal" hidden={activeTab !== 'personal'}>
      <div className="profile-layout">
        <form id="profile-form" ref={formRef} noValidate onSubmit={submit} className="profile-editor" aria-labelledby="profile-personal-heading" aria-busy={saving} onFocusCapture={event => {
          const field = event.target
          if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) return
          if (field.name === 'firstName' || field.name === 'lastName') setActiveSection('firstName')
          else if (field.name === 'phone' || field.id === 'profile-email') setActiveSection('phone')
          else if (field.name === 'bio') setActiveSection('bio')
        }}>
          <div className="profile-section-heading"><span className="profile-section-icon"><Icon name="user" /></span><div><h2 id="profile-personal-heading">Datos personales</h2></div><span className={`profile-editor-state${hasChanges ? ' is-draft' : ''}`}><Icon name={hasChanges ? 'edit' : 'check'} width="14" height="14" />{hasChanges ? 'Sin guardar' : 'Al día'}</span></div>
          <nav className="profile-field-shortcuts" aria-label="Ir a un campo de tu perfil">{([{ name: 'firstName', label: 'Nombre', icon: 'user' }, { name: 'phone', label: 'Contacto', icon: 'phone' }, { name: 'bio', label: 'Presentación', icon: 'file' }] as const).map(item => <button type="button" key={item.name} disabled={busy} aria-pressed={activeSection === item.name} onClick={() => focusField(item.name)}><Icon name={item.icon} width="17" height="17" />{item.label}</button>)}</nav>
          <div className="profile-mobile-photo">
            <button type="button" onClick={() => photoInput.current?.click()} disabled={busy} aria-label="Editar foto de perfil"><Avatar user={previewUser} className="profile-mobile-avatar" /><span><strong>{fullName}</strong><span><Icon name="camera" />{photoStatus === 'uploading' ? 'Subiendo foto…' : 'Cambiar foto'}</span></span></button>
            <p>JPG, PNG o WebP · Máx. 4 MB</p>
            {photoError && <p role="alert" className="profile-field-error">{photoError}</p>}
          </div>
          <FormError errors={errors} />
          {success && <p role="status" className="profile-feedback profile-feedback-success"><Icon name="check" />Tu perfil se ha actualizado.</p>}
          <div className="profile-name-fields">
            <AuthField label="Nombres" icon="user" name="firstName" autoComplete="given-name" value={data.firstName} onChange={change} error={errors.firstName} required maxLength={100} disabled={busy} />
            <AuthField label="Apellidos" icon="user" name="lastName" autoComplete="family-name" value={data.lastName} onChange={change} error={errors.lastName} required maxLength={100} disabled={busy} />
          </div>
          <div className="profile-form-section">
            <h3><Icon name="phone" width="18" height="18" />Información de contacto</h3>
            <AuthField label={isAdvisor ? 'Celular con WhatsApp' : 'Teléfono (opcional)'} icon={isAdvisor ? 'whatsapp' : 'phone'} name="phone" type="tel" autoComplete="tel" placeholder="+591 71234567"
              hint="Incluye el prefijo de tu país. Ej.: +591."
              value={data.phone} onChange={change} error={errors.phone} required={isAdvisor && hasContactPhone} maxLength={40} disabled={busy} />
            <div className="profile-email-field"><label htmlFor="profile-email">Correo electrónico</label><div><Icon name="mail" /><input id="profile-email" type="email" value={user?.email ?? ''} readOnly aria-describedby="profile-email-help" /><Icon name="lock" /></div>
              <p id="profile-email-help"><button type="button" onClick={openSecurity}>Cambiar correo <Icon name="arrow" /></button></p>
            </div>
          </div>
          <div className="profile-form-section profile-bio-field">
            <label htmlFor="bio"><span className="profile-bio-label"><Icon name="file" width="18" height="18" />Acerca de ti</span><span>Opcional</span></label>
            <p id="bio-help">{isAdvisor ? 'Tus zonas y especialidad, en pocas palabras.' : 'Una breve presentación.'}</p>
            <textarea id="bio" name="bio" value={data.bio} onChange={change} rows={4} maxLength={1000}
              placeholder={isAdvisor ? 'Ej.: Te ayudo a encontrar tu próximo hogar en Cochabamba…' : 'Escribe una breve presentación…'} disabled={busy}
              aria-invalid={!!errors.bio?.length} aria-describedby={`bio-help bio-count${errors.bio?.length ? ' bio-error' : ''}`} />
            <div className="profile-bio-bottom">{errors.bio?.length ? <p id="bio-error" className="profile-field-error">{errors.bio.join(' ')}</p> : <span />}<span id="bio-count">{data.bio.length}/1000</span></div>
          </div>
        </form>

        <aside className="profile-preview" aria-label="Vista previa de tu perfil">
          <div className="profile-preview-heading"><Icon name="eye" /><span>Vista previa</span>{hasChanges && <small>Sin guardar</small>}</div>
          <div className="profile-preview-cover" aria-hidden="true"><Icon name="home" /></div>
          <div className="profile-preview-body">
            <div className="profile-photo-wrap">
              <button type="button" className="profile-photo-button" onClick={() => photoInput.current?.click()} disabled={busy} aria-label="Cambiar foto de perfil" aria-describedby="profile-photo-help" aria-busy={photoStatus === 'uploading'}>
                <Avatar user={previewUser} className="profile-preview-avatar" /><span className="profile-photo-edit"><Icon name="camera" /></span>
              </button>
              <span className="profile-role-badge">{roleLabel}</span>
            </div>
            <div className="profile-preview-name"><h2>{fullName}</h2><button type="button" className="profile-preview-edit" onClick={() => focusField('firstName')} disabled={busy} aria-label="Editar nombre"><Icon name="edit" width="17" height="17" /></button></div>
            {isAdvisor && <p className="profile-preview-organization"><Icon name="building" />{user?.organizationName || (user?.organizationId ? 'Mi inmobiliaria' : 'Asesor independiente')}</p>}
            <div className="profile-preview-presentation"><p className={`profile-preview-bio${!data.bio.trim() ? ' is-empty' : ''}`}>{data.bio.trim() || 'Agrega una breve presentación.'}</p><button type="button" className="profile-preview-edit" onClick={() => focusField('bio')} disabled={busy} aria-label="Editar presentación"><Icon name="edit" width="16" height="16" /></button></div>
            <div className="profile-preview-contact"><Icon name="phone" />{data.phone.trim() ? <button type="button" className="profile-preview-phone" onClick={focusPhone} disabled={busy} aria-label="Editar teléfono">{data.phone.trim()}<Icon name="edit" width="15" height="15" /></button> : <button type="button" className="profile-add-phone" onClick={focusPhone} disabled={busy}>Agrega tu número de contacto</button>}</div>
            <div className="profile-photo-controls">
              <input ref={photoInput} id="profile-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={changePhoto} disabled={busy} hidden aria-label="Seleccionar foto de perfil" />
              <button type="button" className="profile-photo-link" onClick={() => photoInput.current?.click()} disabled={busy}><Icon name="camera" />{photoStatus === 'uploading' ? 'Subiendo foto…' : 'Cambiar foto'}</button>
              <p id="profile-photo-help">JPG, PNG o WebP · 4 MB máx. · Guardado automático</p>
              {photoStatus === 'uploading' && <p role="status">Actualizando tu foto…</p>}
              {photoStatus === 'saved' && <p role="status" className="profile-photo-success">Tu foto de perfil se actualizó.</p>}
              {photoError && <p role="alert" className="profile-field-error">{photoError}</p>}
            </div>
          </div>
        </aside>
      </div>
      <div className={`profile-savebar${hasChanges ? ' has-changes' : ''}`}>
        <p><span className="profile-save-indicator"><Icon name={hasChanges ? 'edit' : 'check'} /></span>{photoStatus === 'uploading' ? 'Actualizando tu foto…' : saving ? 'Guardando tu información…' : hasChanges ? 'Tienes cambios sin guardar' : 'Sin cambios pendientes'}</p>
        <div><button type="button" className="button button-secondary" onClick={discard} disabled={busy || !hasChanges}>Descartar</button><button type="submit" form="profile-form" className="button button-primary" disabled={busy || !hasChanges}>{saving ? 'Guardando…' : <><Icon name="check" />Guardar cambios</>}</button></div>
      </div>
    </div>

    <div id="profile-panel-security" role="tabpanel" aria-labelledby="profile-tab-security" hidden={activeTab !== 'security'}><AccountSecurity emailRequest={emailRequest} /></div>
  </div>
}
