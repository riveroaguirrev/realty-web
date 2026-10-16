import { FormEvent, useState } from 'react'
import type { RequirementInput, RequirementRecord } from '@shared/types/requirements'
import { requirementsAPI, requirementError } from '@/services/requirements'
import { PROPERTY_TYPES } from '@/utils/propertyPresentation'
interface Props { token: string; initial?: RequirementRecord; onSaved: (id: string) => void }
export const RequirementForm = ({ token, initial, onSaved }: Props) => {
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
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('')
    if (!openBudget && !min && !max) { setError('Indica un presupuesto o selecciona presupuesto abierto.'); return }
    setBusy(true)
    try {
      const payload: RequirementInput = { title, description, operation, propertyType: [type], cities: split(city), zones: split(zones), currency,
        priceMin: openBudget ? null : numeric(min), priceMax: openBudget ? null : numeric(max),
        bedroomsMin: numeric(bedrooms), bathroomsMin: numeric(bathrooms), areaMin: numeric(area),
        requiresGarage: garage, requiresGroundFloor: ground, petsRequired: pets }
      const result = initial ? await requirementsAPI.update(token, initial.id, payload) : await requirementsAPI.create(token, payload)
      onSaved(result.data.id)
    } catch (err) { setError(requirementError(err)) } finally { setBusy(false) }
  }
  return <form className="requirement-form" onSubmit={submit}>
    <div className="req-form-section"><h2>¿Qué busca tu cliente?</h2><p>Publica la búsqueda para que otros asesores puedan ayudarte.</p>
      <label>Título del requerimiento<input required minLength={5} maxLength={180} value={title} onChange={e => setTitle(e.target.value)} placeholder="Departamento de 3 habitaciones con garaje" /></label>
      <div className="req-fields"><label>Operación<select value={operation} onChange={e => setOperation(e.target.value as RequirementInput['operation'])}><option value="RENTAL">Alquiler</option><option value="SALE">Compra</option><option value="ANTICRETIC">Anticrético</option></select></label>
      <label>Tipo de inmueble<select value={type} onChange={e => setType(e.target.value)}>{Object.entries(PROPERTY_TYPES).map(([value, label]) => <option key={value} value={value}>{value === 'COMMERCIAL' ? 'Local comercial' : label}</option>)}</select></label></div>
      <label>Características y condiciones<textarea rows={4} maxLength={3000} value={description} onChange={e => setDescription(e.target.value)} placeholder="Por ejemplo: local para restaurante, avenida o calle concurrida. El cliente no tiene mascotas." /></label>
    </div>
    <div className="req-form-section"><h2>Ubicación</h2><div className="req-fields"><label>Ciudad o ciudades<input required value={city} onChange={e => setCity(e.target.value)} placeholder="Cochabamba" /><small>Separa varias ciudades con comas.</small></label><label>Zonas de preferencia<input value={zones} onChange={e => setZones(e.target.value)} placeholder="Norte, Centro, Beijing" /><small>Separa las alternativas con comas.</small></label></div></div>
    <div className="req-form-section"><h2>Presupuesto {operation === 'RENTAL' ? 'mensual' : ''}</h2><label className="req-check"><input type="checkbox" checked={openBudget} onChange={e => setOpenBudget(e.target.checked)} />Presupuesto abierto</label>
      <div className="req-fields"><label>Moneda<select value={currency} onChange={e => setCurrency(e.target.value as RequirementInput['currency'])}><option value="BOB">Bolivianos (Bs.)</option><option value="USD">Dólares (USD)</option></select></label>
      {!openBudget && <><label>Desde (opcional)<input type="number" min="0" step="0.01" value={min} onChange={e => setMin(e.target.value)} /></label><label>Hasta<input type="number" min="0" step="0.01" value={max} onChange={e => setMax(e.target.value)} placeholder="4000" /></label></>}</div>
    </div>
    <div className="req-form-section"><h2>Características necesarias</h2><div className="req-fields"><label>Habitaciones mínimas<input type="number" min="0" max="100" value={bedrooms} onChange={e => setBedrooms(e.target.value)} /></label><label>Baños mínimos<input type="number" min="0" max="100" value={bathrooms} onChange={e => setBathrooms(e.target.value)} /></label><label>Superficie mínima (m²)<input type="number" min="1" step="any" value={area} onChange={e => setArea(e.target.value)} /></label></div>
      <div className="req-checks"><label className="req-check"><input type="checkbox" checked={garage} onChange={e => setGarage(e.target.checked)} />Necesita garaje</label><label className="req-check"><input type="checkbox" checked={ground} onChange={e => setGround(e.target.checked)} />En planta baja</label><label className="req-check"><input type="checkbox" checked={pets} onChange={e => setPets(e.target.checked)} />Debe admitir mascotas</label></div>
    </div>
    {error && <p className="req-error" role="alert">{error}</p>}
    <p className="req-note">{initial ? 'Al guardar se actualizarán las sugerencias.' : 'Al publicar, los demás asesores recibirán un aviso y podrás revisar inmuebles sugeridos.'} Las condiciones del texto libre deben confirmarse con el asesor del inmueble.</p>
    <button className="button button-primary" disabled={busy} type="submit">{busy ? 'Guardando…' : initial ? 'Guardar cambios' : 'Publicar requerimiento'}</button>
  </form>
}
