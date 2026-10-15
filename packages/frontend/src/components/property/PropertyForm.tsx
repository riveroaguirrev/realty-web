import { CityAutocomplete } from './CityAutocomplete'
import { Icon } from '@/components/ui/Icon'
import { PropertyImageEditor } from './PropertyImageEditor'
import { PropertyLocationMap } from '@/components/map/PropertyLocationMap'
import { Link } from 'react-router-dom'
import { PROPERTY_TYPES } from '@/utils/propertyPresentation'
import { FormEvent, useState, useEffect } from 'react'
import { propertyAPI } from '@/services/property'
import { getErrorMessage } from '@/utils/errorMessage'
import { PROPERTY_STATUS_OPTIONS } from '@/utils/propertyStatus'

const NUMERIC_FIELDS = ['price', 'bedrooms', 'bathrooms', 'areaSquareMeters']
const INPUT_CLASS = 'property-control'
const LABEL_CLASS = 'property-label'

export interface EditableProperty {
  id: string
  title: string
  description?: string | null
  type: string
  price: number | string
  address: string
  city: string
  region: string
  bedrooms?: number | null
  bathrooms?: number | null
  areaSquareMeters?: number | string | null
  images?: string[]
  status?: string
  operation?: 'SALE' | 'RENTAL' | 'ANTICRETIC'
  currency?: 'USD' | 'BOB'
  furnished?: 'UNFURNISHED' | 'PARTIALLY_FURNISHED' | 'FULLY_FURNISHED'
  petsAllowed?: boolean
  expensesIncluded?: boolean
  wifiIncluded?: boolean
  commissionPercentage?: number
  isExclusive?: boolean
  locationMode?: 'EXACT' | 'RADIUS'
  locationRadiusMeters?: number
  latitude?: number | null
  longitude?: number | null
}

interface PropertyFormProps {
  token: string
  property?: EditableProperty
  onSubmit?: () => void
}

const EMPTY_FORM = {
  title: '',
  operation: 'SALE' as 'SALE' | 'RENTAL' | 'ANTICRETIC',
  description: '',
  type: 'RESIDENTIAL',
  price: 0,
  currency: 'USD' as 'USD' | 'BOB',
  furnished: 'UNFURNISHED' as 'UNFURNISHED' | 'PARTIALLY_FURNISHED' | 'FULLY_FURNISHED',
  petsAllowed: false,
  expensesIncluded: false,
  wifiIncluded: false,
  commissionPercentage: 0,
  address: '',
  city: '',
  region: '',
  bedrooms: 0,
  bathrooms: 0,
  areaSquareMeters: 0,
  status: 'AVAILABLE',
  isExclusive: false,
  locationMode: 'RADIUS' as 'EXACT' | 'RADIUS',
  locationRadiusMeters: 500,
  latitude: null as number | null,
  longitude: null as number | null,
}

const toFormData = (property?: EditableProperty) =>
  property
    ? {
        title: property.title,
        operation: property.operation ?? 'SALE',
        description: property.description ?? '',
        type: property.type,
        price: Number(property.price),
        currency: property.currency === 'BOB' ? 'BOB' : 'USD',
        furnished: property.furnished === 'FULLY_FURNISHED' || property.furnished === 'PARTIALLY_FURNISHED' ? property.furnished : 'UNFURNISHED',
        petsAllowed: property.petsAllowed ?? false,
        expensesIncluded: property.expensesIncluded ?? false,
        wifiIncluded: property.wifiIncluded ?? false,
        commissionPercentage: property.commissionPercentage ?? 0,
        address: property.address,
        city: property.city,
        region: property.region,
        bedrooms: property.bedrooms ?? 0,
        bathrooms: property.bathrooms ?? 0,
        areaSquareMeters: Number(property.areaSquareMeters ?? 0),
        status: property.status ?? 'AVAILABLE',
        isExclusive: property.isExclusive ?? false,
        locationMode: property.isExclusive && property.locationMode === 'EXACT' ? 'EXACT' as const : 'RADIUS' as const,
        locationRadiusMeters: Math.max(100, Math.min(1000, property.locationRadiusMeters ?? 500)),
        latitude: property.latitude ?? null,
        longitude: property.longitude ?? null,
      }
    : EMPTY_FORM

export const PropertyForm = ({ token, property, onSubmit }: PropertyFormProps) => {
  const isEditing = Boolean(property)

  const [formData, setFormData] = useState(() => toFormData(property))
  const [existingImages, setExistingImages] = useState<string[]>(property?.images ?? [])
  const [images, setImages] = useState<File[]>([])
  const [existingImageEdits, setExistingImageEdits] = useState<Record<string, File>>({})
  const [existingPreviews, setExistingPreviews] = useState<Record<string, string>>({})
  const [editingImage, setEditingImage] = useState<{ kind: 'new'; index: number } | { kind: 'existing'; url: string } | null>(null)
  useEffect(() => {
    const urls = Object.fromEntries(Object.entries(existingImageEdits).map(([url, file]) => [url, URL.createObjectURL(file)]))
    setExistingPreviews(urls)
    return () => Object.values(urls).forEach(url => URL.revokeObjectURL(url))
  }, [existingImageEdits])
  const [previews, setPreviews] = useState<string[]>([])
  useEffect(() => {
    const urls = images.map(file => URL.createObjectURL(file))
    setPreviews(urls)
    return () => urls.forEach(url => URL.revokeObjectURL(url))
  }, [images])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: NUMERIC_FIELDS.includes(name) ? Number(value) : value,
    }))
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      if (files.some(file => !file.type.startsWith('image/') || file.size > 5 * 1024 * 1024)) {
        setError('Selecciona imágenes de hasta 5 MB cada una.')
        e.target.value = ''
        return
      }
      setError(null)
      setImages(prev => [...prev, ...files])
      e.target.value = ''
    }
  }

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleRemoveExistingImage = (url: string) => {
    setExistingImages((prev) => prev.filter((existingUrl) => existingUrl !== url))
    setExistingImageEdits(previous => {
      const updated = { ...previous }
      delete updated[url]
      return updated
    })
  }

  const uploadImages = async (): Promise<string[]> => {
    const urls: string[] = []
    for (const url of existingImages) {
      const edited = existingImageEdits[url]
      if (!edited) { urls.push(url); continue }
      try { urls.push(await propertyAPI.uploadImage(token, edited)) }
      catch (err) { throw new Error(`No pudimos subir el recorte: ${getErrorMessage(err, 'Inténtalo de nuevo')}`) }
    }
    for (const file of images) {
      try {
        urls.push(await propertyAPI.uploadImage(token, file))
      } catch (err) {
        throw new Error(`No pudimos subir "${file.name}": ${getErrorMessage(err, 'Inténtalo de nuevo')}`)
      }
    }
    return urls
  }

  const buildPayload = (imageUrls: string[]) => ({
    ...formData,
    bedrooms: formData.bedrooms || undefined,
    bathrooms: formData.bathrooms || undefined,
    areaSquareMeters: formData.areaSquareMeters || undefined,
    images: imageUrls,
  })

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isLoading || success) return
    if (formData.latitude == null || formData.longitude == null) {
      setError('Selecciona la ubicación o el centro de la zona en el mapa antes de publicar.')
      return
    }
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const imageUrls = await uploadImages()
      const payload = buildPayload(imageUrls)

      if (property) {
        await propertyAPI.update(token, property.id, payload)
      } else {
        await propertyAPI.createProperty(token, payload)
        setFormData(EMPTY_FORM)
        setImages([])
      }

      setSuccess(true)
      if (onSubmit) {
        onSubmit()
      }
    } catch (err) {
      setError(getErrorMessage(err, 'No pudimos guardar la propiedad. Revisa los datos e inténtalo de nuevo.'))
    } finally {
      setIsLoading(false)
    }
  }

  const field = (name: keyof typeof formData, label: string, required = false, placeholder?: string) => <div>
    <label htmlFor={`property-${name}`} className={LABEL_CLASS}>{label}{required ? ' *' : ''}</label>
    <input id={`property-${name}`} name={name} type={NUMERIC_FIELDS.includes(name) ? 'number' : 'text'} value={String(formData[name] ?? '')} onChange={handleChange} className={INPUT_CLASS} required={required} placeholder={placeholder} min={NUMERIC_FIELDS.includes(name) ? 0 : undefined} step={NUMERIC_FIELDS.includes(name) ? name === 'areaSquareMeters' ? '0.01' : '1' : undefined} />
  </div>
  return <form onSubmit={handleSubmit} className="property-form bg-white shadow rounded-xl p-8">
    <div className="page-heading"><div><p className="eyebrow">{isEditing ? 'ACTUALIZA TU PUBLICACIÓN' : 'UNA NUEVA OPORTUNIDAD'}</p><h1>{isEditing ? 'Editar propiedad' : 'Publicar propiedad'}</h1><p>Completa los datos del inmueble. Los campos con * son obligatorios.</p></div></div>
    {error && <div role="alert" className="form-error">{error}</div>}
    {success && <p role="status" className="text-green-700 mb-4">Propiedad guardada correctamente.</p>}
    <fieldset disabled={isLoading || success}>
      <section className="form-section"><div className="form-section-heading"><span className="step-number">01</span><div><h3>Información principal</h3><p>Un título claro ayuda a encontrar tu propiedad.</p></div></div>
        <div className="property-fields">
          <div className="property-title-field">{field('title', 'Título de la publicación', true, 'Ej. Departamento luminoso en Sopocachi')}</div>
          <div>
            <label htmlFor="property-operation" className={LABEL_CLASS}>Tipo de operación *</label>
            <select id="property-operation" name="operation" value={formData.operation} onChange={handleChange} className={INPUT_CLASS} required>
              <option value="SALE">Venta</option><option value="RENTAL">Alquiler</option><option value="ANTICRETIC">Anticrético</option>
            </select>
          </div>
          <div>
            <label htmlFor="property-type" className={LABEL_CLASS}>Tipo de propiedad *</label>
            <select id="property-type" name="type" value={formData.type} onChange={handleChange} className={INPUT_CLASS} required>
              {Object.entries(PROPERTY_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="property-price" className={LABEL_CLASS}>Precio *</label>
            <input id="property-price" name="price" type="number" value={formData.price} onChange={handleChange} className={INPUT_CLASS} required min="1" step="1" />
          </div>
          <div>
            <label htmlFor="property-currency" className={LABEL_CLASS}>Moneda *</label>
            <select id="property-currency" name="currency" value={formData.currency} onChange={handleChange} className={INPUT_CLASS} required>
              <option value="USD">Dólares (USD)</option><option value="BOB">Bolivianos (Bs)</option>
            </select>
          </div>
          {formData.operation === 'SALE' && <div>
            <label htmlFor="property-sale-commission" className={LABEL_CLASS}>Comisión a cobrar (%)</label>
            <input id="property-sale-commission" name="commissionPercentage" type="number" min="0" max="100" step="1" value={formData.commissionPercentage} onChange={e => setFormData(prev => ({ ...prev, commissionPercentage: Number(e.target.value) }))} className={INPUT_CLASS} />
          </div>}
          {isEditing && <div><label htmlFor="property-status" className={LABEL_CLASS}>Estado de la publicación</label><select id="property-status" name="status" value={formData.status} onChange={handleChange} className={INPUT_CLASS}>{PROPERTY_STATUS_OPTIONS.map(({value,label}) => <option key={value} value={value}>{label}</option>)}</select></div>}
        </div>
        <div className="mt-6"><label htmlFor="property-description" className={LABEL_CLASS}>Descripción</label><textarea id="property-description" name="description" value={formData.description} onChange={handleChange} rows={4} className={INPUT_CLASS} placeholder="Cuéntanos qué hace especial a esta propiedad: distribución, servicios y lugares cercanos." /></div>
        {(formData.operation === 'RENTAL' || formData.operation === 'ANTICRETIC') && <div className="operation-options"><h4>{formData.operation === 'RENTAL' ? 'Condiciones del alquiler' : 'Condiciones del anticrético'}</h4><div className="options-grid"><label><input type="checkbox" checked={formData.furnished !== 'UNFURNISHED'} onChange={e => setFormData(prev => ({ ...prev, furnished: e.target.checked ? 'FULLY_FURNISHED' : 'UNFURNISHED' }))} /> Amoblado</label><label><input type="checkbox" checked={formData.petsAllowed} onChange={e => setFormData(prev => ({ ...prev, petsAllowed: e.target.checked }))} /> Se permiten mascotas</label><label><input type="checkbox" checked={formData.expensesIncluded} onChange={e => setFormData(prev => ({ ...prev, expensesIncluded: e.target.checked }))} /> Expensas incluidas</label><label><input type="checkbox" checked={formData.wifiIncluded} onChange={e => setFormData(prev => ({ ...prev, wifiIncluded: e.target.checked }))} /> Wifi incluido</label><label className="commission-field">Comisión a pagar por el lado colocador (%)<input aria-describedby="placing-commission-hint" type="number" min="0" max="100" step="1" value={formData.commissionPercentage} onChange={e => setFormData(prev => ({ ...prev, commissionPercentage: Number(e.target.value) }))} /><span id="placing-commission-hint" className="commission-hint">Este porcentaje corresponde a la comisión que debe pagar el lado colocador de la operación.</span></label></div></div>}
      </section>
      <section className="form-section"><div className="form-section-heading"><span className="step-number">02</span><div><h3>Ubicación y características</h3><p>Ayuda a los interesados a saber si este es su próximo espacio.</p></div></div>
        <div className="location-settings">
          <div className={`exclusivity-card${formData.isExclusive ? ' is-active' : ''}`}>
            <div className="exclusivity-card-top">
              <span className="exclusivity-kicker">Privacidad de la ubicación</span>
              <span className="exclusivity-status">{formData.isExclusive ? 'Con exclusiva' : 'Sin exclusiva'}</span>
            </div>
            <label className="exclusivity-choice" htmlFor="property-exclusive">
              <span className="exclusivity-icon" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></svg>
              </span>
              <span className="exclusivity-copy">
                <span className="exclusivity-title">Tengo la exclusiva de esta propiedad</span>
                <span className="exclusivity-description" id="exclusivity-description">Activa esta opción si cuentas con la exclusiva para comercializar este inmueble.</span>
              </span>
              <span className="exclusivity-switch">
                <input id="property-exclusive" type="checkbox" role="switch" aria-describedby="exclusivity-description exclusivity-location-hint" checked={formData.isExclusive} onChange={e => {
                  const isExclusive = e.target.checked
                  setFormData(prev => ({ ...prev, isExclusive, locationMode: 'RADIUS', latitude: null, longitude: null }))
                }} />
                <span className="exclusivity-switch-track" aria-hidden="true" />
              </span>
            </label>
            <div className="exclusivity-location-hint" id="exclusivity-location-hint" aria-live="polite">
              <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>
              <span><strong>{formData.isExclusive ? 'Tú eliges qué mostrar.' : 'La ubicación exacta queda protegida.'}</strong> {formData.isExclusive ? 'Puedes publicar un marcador exacto o mantener una zona aproximada.' : 'En la publicación solo se verá una zona aproximada.'}</span>
            </div>
          </div>
          <div className="property-fields mt-4">
            <div><label htmlFor="location-mode" className={LABEL_CLASS}>Mostrar ubicación como</label>
              <select id="location-mode" className={INPUT_CLASS} value={formData.locationMode} disabled={!formData.isExclusive} onChange={e => setFormData(prev => ({ ...prev, locationMode: e.target.value as 'EXACT' | 'RADIUS', latitude: null, longitude: null }))}>
                <option value="RADIUS">Zona con radio</option>{formData.isExclusive && <option value="EXACT">Marcador exacto</option>}
              </select>
            </div>

          </div>
          <PropertyLocationMap value={formData} address={formData.address} neighborhood={formData.region} city={formData.city} onAddressChange={(details, baseline) => setFormData(prev => ({
            ...prev,
            address: prev.address === baseline.address ? details.address : prev.address,
            city: prev.city === baseline.city ? details.city : prev.city,
            region: prev.region === baseline.neighborhood ? details.neighborhood : prev.region,
          }))} onRadiusChange={radius => setFormData(prev => ({ ...prev, locationRadiusMeters: radius }))} onChange={coordinates => setFormData(prev => ({ ...prev, ...coordinates }))} />
          {!formData.isExclusive && <p className="location-privacy-note">La dirección escrita queda disponible para gestionar tu publicación. Los demás usuarios verán la zona.</p>}
        </div>
        <div className="property-fields">{field('address','Dirección',true)}<CityAutocomplete value={formData.city} onChange={city => setFormData(prev => ({ ...prev, city }))} />{field('region','Zona o barrio',true)}{field('areaSquareMeters','Superficie (m²)')}{field('bedrooms','Habitaciones')}{field('bathrooms','Baños')}</div>
      </section>
      <section className="form-section property-photos-section"><div className="form-section-heading"><span className="step-number">03</span><div><h3>Fotografías</h3><p>Muestra lo mejor de tu propiedad. Puedes ampliar cada foto y ajustar su encuadre.</p></div></div>
        <label htmlFor="property-images" className="photo-upload">
          <input id="property-images" type="file" multiple accept="image/*" onChange={handleImageSelect} className="photo-upload-input" aria-describedby="photo-upload-help" />
          <span className="photo-upload-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9M17 3h6m-3-3v6M3 16l5-5 9 10m-4-4 3-3 5 5" /><circle cx="8" cy="7" r="1" /></svg></span>
          <span className="photo-upload-copy"><strong>Un buen espacio merece buenas fotos</strong><span id="photo-upload-help">Selecciona varias imágenes · Hasta 5 MB por foto</span></span>
          <span className="photo-upload-cta"><Icon name="plus" />Agregar fotos</span>
        </label>
        {(existingImages.length > 0 || images.length > 0) && <>
        <div className="photo-gallery-heading"><h4>Tu galería <span>{existingImages.length + images.length}</span></h4><p>La primera foto será la portada</p></div>
        <div className="property-photo-grid">
          {existingImages.map((url, index) => <div key={url} className="property-photo">
            <button type="button" className="property-photo-edit" onClick={() => setEditingImage({ kind: 'existing', url })} aria-label={`Ampliar y recortar fotografía ${index + 1}`}><img src={existingPreviews[url] ?? url} alt={`Fotografía ${index + 1}`} /><span><span>Foto {String(index + 1).padStart(2, '0')}</span><span>Ajustar encuadre <Icon name="arrow" width="14" height="14" /></span></span></button>
            {index === 0 && <span className="property-photo-cover"><Icon name="check" width="12" height="12" />Portada</span>}
            <button type="button" onClick={() => handleRemoveExistingImage(url)} aria-label={`Quitar fotografía ${index + 1}`} className="property-photo-remove"><Icon name="close" width="15" height="15" /></button>
          </div>)}
          {images.map((file, index) => <div key={index} className="property-photo">
            <button type="button" className="property-photo-edit" onClick={() => setEditingImage({ kind: 'new', index })} aria-label={`Ampliar y recortar ${file.name}`}><img src={previews[index]} alt={file.name} /><span><span>Foto {String(existingImages.length + index + 1).padStart(2, '0')}</span><span>Ajustar encuadre <Icon name="arrow" width="14" height="14" /></span></span></button>
            {existingImages.length === 0 && index === 0 && <span className="property-photo-cover"><Icon name="check" width="12" height="12" />Portada</span>}
            <button type="button" onClick={() => handleRemoveImage(index)} aria-label={`Quitar ${file.name}`} className="property-photo-remove"><Icon name="close" width="15" height="15" /></button>
          </div>)}
        </div></>}
        <p className="form-review-note" role="status">{isLoading ? 'Estamos guardando los datos y las fotografías…' : 'Revisa la información antes de guardar.'}</p>
      </section>
      <div className="form-actions">{!isLoading && <Link to="/properties" className="button button-secondary">Volver a mis propiedades</Link>}<button type="submit" disabled={isLoading || success} className="button button-primary">{isLoading ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Publicar propiedad'}</button></div>
    </fieldset>
    {editingImage && <PropertyImageEditor
      src={editingImage.kind === 'new' ? previews[editingImage.index] : existingPreviews[editingImage.url] ?? editingImage.url}
      filename={editingImage.kind === 'new' ? images[editingImage.index].name : 'fotografia'}
      onClose={() => setEditingImage(null)}
      onSave={file => {
        if (editingImage.kind === 'new') setImages(previous => previous.map((image, index) => index === editingImage.index ? file : image))
        else setExistingImageEdits(previous => ({ ...previous, [editingImage.url]: file }))
        setEditingImage(null)
      }}
    />}
  </form>
}
