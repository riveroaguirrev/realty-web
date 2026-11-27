import { FormEvent, useState, useRef, useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon, type IconName } from '@/components/ui/Icon'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { REQUIREMENT_STEPS, validateRequirementStep } from '@/utils/requirementWizard'
import './RequirementForm.css'
import { useAuth } from '@/hooks/useAuth'
import { RequirementVisibilityControl } from './RequirementVisibilityControl'
import type { RequirementInput, RequirementRecord } from '@shared/types/requirements'
import { requirementsAPI, requirementError } from '@/services/requirements'
import { PROPERTY_TYPES, formatPrice } from '@/utils/propertyPresentation'
const STEP_ICONS: IconName[] = ['home', 'pin', 'filter', 'check']
const Control = ({ icon, children }: { icon: IconName; children: ReactNode }) => <span className="req-icon-control"><Icon name={icon} />{children}</span>
interface Props { token: string; initial?: RequirementRecord; onSaved: (id: string) => void }
export const RequirementForm = ({ token, initial, onSaved }: Props) => {
  const { user } = useAuth()
  const [step, setStep] = useState(0)
  const [furthestStep, setFurthestStep] = useState(0)
  const stepStatus = useRef<HTMLParagraphElement>(null)
  const previousStep = useRef(0)
  const formRef = useRef<HTMLFormElement>(null)
  const [visibility, setVisibility] = useState<NonNullable<RequirementInput['visibility']>>(initial?.visibility || 'PUBLIC')
  const [title, setTitle] = useState(initial?.title || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [operation, setOperation] = useState<RequirementInput['operation']>(initial?.operation || 'RENTAL')
  const [type, setType] = useState(initial?.propertyType[0] || 'APARTMENT')
  const [city, setCity] = useState(initial?.cities.join(', ') || '')
  const [zones, setZones] = useState(initial?.zones.join(', ') || '')
  const [currency, setCurrency] = useState<RequirementInput['currency']>(initial?.currency || 'BOB')
  const [openBudget, setOpenBudget] = useState(initial ? initial.priceMin == null && initial.priceMax == null : false)
  const [min, setMin] = useState(String(initial?.priceMin ?? ''))
  const [max, setMax] = useState(String(initial?.priceMax ?? ''))
  const [bedrooms, setBedrooms] = useState(String(initial?.bedroomsMin ?? ''))
  const [bathrooms, setBathrooms] = useState(String(initial?.bathroomsMin ?? ''))
  const [area, setArea] = useState(String(initial?.areaMin ?? ''))
  const [garage, setGarage] = useState(initial?.requiresGarage || false)
  const [ground, setGround] = useState(initial?.requiresGroundFloor || false)
  const [pets, setPets] = useState(initial?.petsRequired || false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const split = (s: string) => [...new Set(s.split(',').map(x => x.trim()).filter(Boolean))]
  const numeric = (s: string) => s.trim() ? Number(s) : null
  const payload: RequirementInput = { visibility, title, description, operation, propertyType: [type], cities: split(city), zones: split(zones), currency,
    priceMin: openBudget ? null : numeric(min), priceMax: openBudget ? null : numeric(max),
    bedroomsMin: numeric(bedrooms), bathroomsMin: numeric(bathrooms), areaMin: numeric(area),
    requiresGarage: garage, requiresGroundFloor: ground, petsRequired: pets }
  useEffect(() => {
    if (initial || previousStep.current === step) return
    previousStep.current = step
    stepStatus.current?.focus({ preventScroll: true })
    stepStatus.current?.scrollIntoView({ block: 'start', behavior: 'auto' })
  }, [step, initial])
  const validateStages = (stages: number[]) => {
    for (const stage of stages) {
      const issue = validateRequirementStep(stage, payload, openBudget)
      if (issue) {
        if (!initial) setStep(stage)
        setError(issue.message)
        window.requestAnimationFrame(() => {
          const field = document.getElementById(issue.field)
          if (field && formRef.current?.contains(field)) field.focus()
        })
        return false
      }
    }
    return true
  }
  const goToStep = (next: number) => {
    if (busy || (next > step && !validateStages(Array.from({length: next}, (_, index) => index)))) return
    setError('')
    setStep(next)
    setFurthestStep(previous => Math.max(previous, next))
  }
  const budgetLabel = openBudget ? 'Presupuesto abierto' : min || max
    ? `${min ? `Desde ${formatPrice(min, currency)}` : ''}${min && max ? ' · ' : ''}${max ? `Hasta ${formatPrice(max, currency)}` : ''}`
    : 'Presupuesto por definir'
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    setError('')
    if (!validateStages(initial || step === 3 ? [0, 1, 2] : [step])) return
    if (!initial && step < 3) { goToStep(step + 1); return }
    setBusy(true)
    try {
      const result = initial ? await requirementsAPI.update(token, initial.id, payload) : await requirementsAPI.create(token, payload)
      onSaved(result.data.id)
    } catch (err) { setError(requirementError(err)) } finally { setBusy(false) }
  }
  return <form ref={formRef} className="requirement-form req-interactive-form" onSubmit={submit}>
    {!initial && <div className="req-wizard-progress"><ol aria-label="Pasos para crear el requerimiento">{REQUIREMENT_STEPS.map((label, index) => <li key={label} className={index === step ? 'is-current' : index < step ? 'is-complete' : ''}><button type="button" disabled={busy || index > furthestStep} aria-current={index === step ? 'step' : undefined} onClick={() => goToStep(index)}><span className="req-step-icon"><Icon name={index < step ? 'check' : STEP_ICONS[index]} /></span><span>{label}</span></button></li>)}</ol><div className="req-progress-track" aria-hidden="true"><span style={{width: `${(step + 1) / 4 * 100}%`}} /></div><p ref={stepStatus} tabIndex={-1} className="req-step-status">Paso {step + 1} de 4 · {REQUIREMENT_STEPS[step]}</p></div>}
    {!initial && step !== 3 && <aside className="req-live-preview" aria-label="Vista previa del requerimiento"><span className="req-live-icon"><Icon name="search" width="25" height="25" /></span><div><span className="req-live-kicker">{operation === 'SALE' ? 'Compra' : operation === 'RENTAL' ? 'Alquiler' : 'Anticrético'} · {PROPERTY_TYPES[type]}</span><strong>{title.trim() || 'La búsqueda de tu cliente'}</strong><span>{budgetLabel}</span>{city.trim() && <span className="req-live-location"><Icon name="pin" width="14" height="14" />{city}{zones.trim() ? ` · ${zones}` : ''}</span>}</div></aside>}
    {error && <p className="req-error" role="alert">{error}</p>}
    <fieldset className="req-form-body" disabled={busy}>
    {(initial || step === 0) && <>
      {(user?.organizationId || initial?.visibility === 'ORGANIZATION') && <RequirementVisibilityControl value={visibility} onChange={setVisibility} disabled={busy} />}
      <section className="req-form-section"><h2><Icon name="home" />¿Qué busca tu cliente?</h2>
        <label>Título del requerimiento<Control icon="edit"><input id="requirement-title" required minLength={5} maxLength={180} value={title} onChange={e => setTitle(e.target.value)} placeholder="Departamento de 3 habitaciones con garaje" /></Control></label>
        <div className="req-fields"><div className="req-select-field"><label htmlFor="requirement-operation">Operación</label><div className="req-icon-control"><Icon name="home" /><FilterSelect id="requirement-operation" label="Operación" value={operation} disabled={busy} onChange={value => setOperation(value as RequirementInput['operation'])} options={[['RENTAL', 'Alquiler'], ['SALE', 'Compra'], ['ANTICRETIC', 'Anticrético']]} /></div></div>
        <div className="req-select-field"><label htmlFor="requirement-type">Tipo de inmueble</label><div className="req-icon-control"><Icon name="building" /><FilterSelect id="requirement-type" label="Tipo de inmueble" value={type} disabled={busy} onChange={setType} options={Object.entries(PROPERTY_TYPES).map(([value, label]): [string, string] => [value, value === 'COMMERCIAL' ? 'Local comercial' : label])} /></div></div></div>
        <label>Características y condiciones<Control icon="file"><textarea id="requirement-description" rows={4} maxLength={3000} value={description} onChange={e => setDescription(e.target.value)} placeholder="Por ejemplo: local para restaurante, avenida o calle concurrida. El cliente no tiene mascotas." /></Control></label>
      </section>
    </>}
    {(initial || step === 1) && <>
      <section className="req-form-section"><h2><Icon name="pin" />Ubicación</h2><div className="req-fields"><label>Ciudad o ciudades<Control icon="pin"><input id="requirement-city" required value={city} onChange={e => setCity(e.target.value)} placeholder="Cochabamba" /></Control><small>Separa varias ciudades con comas.</small></label><label>Zonas de preferencia<Control icon="map"><input id="requirement-zones" value={zones} onChange={e => setZones(e.target.value)} placeholder="Norte, Centro, Beijing" /></Control><small>Separa las alternativas con comas.</small></label></div></section>
      <section className="req-form-section"><h2><Icon name="money" />Presupuesto {operation === 'RENTAL' ? 'mensual' : ''}</h2><label className="req-check req-open-budget"><input type="checkbox" checked={openBudget} onChange={e => setOpenBudget(e.target.checked)} /><Icon name="money" />Presupuesto abierto</label>
        <div className="req-fields"><div className="req-select-field"><label htmlFor="requirement-currency">Moneda</label><div className="req-icon-control"><Icon name="money" /><FilterSelect id="requirement-currency" label="Moneda" value={currency} disabled={busy} onChange={value => setCurrency(value as RequirementInput['currency'])} options={[['BOB', 'Bolivianos (Bs.)'], ['USD', 'Dólares (USD)']]} /></div></div>
        {!openBudget && <><label>Desde (opcional)<Control icon="money"><input id="requirement-min" type="number" min="0" step="0.01" value={min} onChange={e => setMin(e.target.value)} /></Control></label><label>Hasta<Control icon="money"><input id="requirement-max" type="number" min="0" step="0.01" value={max} onChange={e => setMax(e.target.value)} placeholder="4000" /></Control></label></>}</div>
      </section>
    </>}
    {(initial || step === 2) && <section className="req-form-section"><h2><Icon name="filter" />Características necesarias</h2><div className="req-fields"><label>Habitaciones mínimas<Control icon="bed"><input id="requirement-bedrooms" type="number" min="0" max="100" value={bedrooms} onChange={e => setBedrooms(e.target.value)} /></Control></label><label>Baños mínimos<Control icon="bath"><input id="requirement-bathrooms" type="number" min="0" max="100" value={bathrooms} onChange={e => setBathrooms(e.target.value)} /></Control></label><label>Superficie mínima (m²)<Control icon="area"><input id="requirement-area" type="number" min="1" step="any" value={area} onChange={e => setArea(e.target.value)} /></Control></label></div>
      <div className="req-checks"><label className="req-check"><input type="checkbox" checked={garage} onChange={e => setGarage(e.target.checked)} /><Icon name="car" />Necesita garaje</label><label className="req-check"><input type="checkbox" checked={ground} onChange={e => setGround(e.target.checked)} /><Icon name="home" />En planta baja</label><label className="req-check"><input type="checkbox" checked={pets} onChange={e => setPets(e.target.checked)} /><Icon name="paw" />Debe admitir mascotas</label></div>
    </section>}
    {!initial && step === 3 && <section className="req-review" aria-labelledby="req-review-title"><h2 id="req-review-title"><Icon name="check" />Revisa tu requerimiento</h2><div className="req-review-overview"><span className="req-live-kicker">{operation === 'SALE' ? 'Compra' : operation === 'RENTAL' ? 'Alquiler' : 'Anticrético'} · {PROPERTY_TYPES[type]}</span><h3>{title}</h3><strong>{budgetLabel}{operation === 'RENTAL' && !openBudget ? ' / mes' : ''}</strong><p><Icon name="pin" />{payload.cities.join(', ')}</p></div>
      <div className="req-review-grid"><article><header><h3><Icon name="file" />Información</h3><button type="button" className="text-link" onClick={() => goToStep(0)}><Icon name="edit" width="16" height="16" />Editar</button></header><p className="req-review-description">{description || 'Sin condiciones adicionales.'}</p><dl><div><dt><Icon name="eye" />Visibilidad</dt><dd>{visibility === 'ORGANIZATION' ? 'Solo mi organización' : 'Todos los asesores'}</dd></div></dl></article>
      <article><header><h3><Icon name="pin" />Ubicación y precio</h3><button type="button" className="text-link" onClick={() => goToStep(1)}><Icon name="edit" width="16" height="16" />Editar</button></header><dl><div><dt>Ciudades</dt><dd>{payload.cities.join(', ')}</dd></div><div><dt>Zonas</dt><dd>{payload.zones.join(', ') || 'Sin preferencia'}</dd></div><div><dt>Moneda</dt><dd>{currency === 'BOB' ? 'Bolivianos (Bs.)' : 'Dólares (USD)'}</dd></div><div><dt>Presupuesto</dt><dd>{budgetLabel}</dd></div></dl></article>
      <article className="req-review-features"><header><h3><Icon name="filter" />Características</h3><button type="button" className="text-link" onClick={() => goToStep(2)}><Icon name="edit" width="16" height="16" />Editar</button></header><dl>{[['bed', 'Habitaciones mínimas', bedrooms || 'Sin preferencia'], ['bath', 'Baños mínimos', bathrooms || 'Sin preferencia'], ['area', 'Superficie mínima', area ? `${area} m²` : 'Sin preferencia'], ['car', 'Garaje', garage ? 'Necesario' : 'Sin requisito'], ['home', 'Planta baja', ground ? 'Necesaria' : 'Sin requisito'], ['paw', 'Mascotas', pets ? 'Debe admitir' : 'Sin requisito']].map(([icon, label, value]) => <div key={label}><dt><Icon name={icon as IconName} />{label}</dt><dd>{value}</dd></div>)}</dl></article></div>
    </section>}
    <details className="req-matching-help"><summary><Icon name="search" width="17" height="17" />Cómo se calculan las coincidencias<Icon name="chevronRight" width="15" height="15" /></summary><p>Se priorizan habitaciones, zona, presupuesto, parqueo, mascotas, superficie y preferencias adicionales. Confirma las condiciones del texto libre con el asesor del inmueble.</p></details>
    <footer className="req-form-actions"><Link className="text-link req-cancel" to="/requirements">Cancelar</Link><div>{!initial && step > 0 && <button type="button" className="button button-secondary" onClick={() => goToStep(step - 1)} disabled={busy}><Icon name="back" width="17" height="17" />Anterior</button>}<button className="button button-primary" disabled={busy} type="submit">{busy ? 'Guardando…' : initial ? <><Icon name="check" />Guardar cambios</> : step < 3 ? <>{step === 2 ? 'Revisar requerimiento' : 'Siguiente'}<Icon name="arrow" width="17" height="17" /></> : <><Icon name="send" />Publicar requerimiento</>}</button></div></footer>
    {(initial || step === 3) && <p className="req-publish-note">{initial ? 'Al guardar se actualizarán las sugerencias.' : 'Verás propiedades compatibles y avisaremos a la audiencia elegida.'}</p>}
    </fieldset>
  </form>
}
