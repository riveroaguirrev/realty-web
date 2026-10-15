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
        locationRadiusMeters: property.locationRadiusMeters ?? 500,
        latitude: property.latitude ?? null,
        longitude: property.longitude ?? null,
      }
    : EMPTY_FORM

export const PropertyForm = ({ token, property, onSubmit }: PropertyFormProps) => {
  const isEditing = Boolean(property)

  const [formData, setFormData] = useState(() => toFormData(property))
  const [existingImages, setExistingImages] = useState<string[]>(property?.images ?? [])
  const [images, setImages] = useState<File[]>([])
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
  }

  const uploadImages = async (): Promise<string[]> => {
    const urls: string[] = []
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
      const imageUrls = [...existingImages, ...(await uploadImages())]
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
    <input id={`property-${name}`} name={name} type={NUMERIC_FIELDS.includes(name) ? 'number' : 'text'} value={String(formData[name] ?? '')} onChange={handleChange} className={INPUT_CLASS} required={required} placeholder={placeholder} min={NUMERIC_FIELDS.includes(name) ? 0 : undefined} step={name === 'price' || name === 'areaSquareMeters' ? '0.01' : undefined} />
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
            <input id="property-price" name="price" type="number" value={formData.price} onChange={handleChange} className={INPUT_CLASS} required min="0.01" step="0.01" />
          </div>
          <div>
            <label htmlFor="property-currency" className={LABEL_CLASS}>Moneda *</label>
            <select id="property-currency" name="currency" value={formData.currency} onChange={handleChange} className={INPUT_CLASS} required>
              <option value="USD">Dólares (USD)</option><option value="BOB">Bolivianos (Bs)</option>
            </select>
          </div>
          {isEditing && <div><label htmlFor="property-status" className={LABEL_CLASS}>Estado de la publicación</label><select id="property-status" name="status" value={formData.status} onChange={handleChange} className={INPUT_CLASS}>{PROPERTY_STATUS_OPTIONS.map(({value,label}) => <option key={value} value={value}>{label}</option>)}</select></div>}
        </div>
        {(formData.operation === 'RENTAL' || formData.operation === 'ANTICRETIC') && <div className="operation-options"><h4>{formData.operation === 'RENTAL' ? 'Condiciones del alquiler' : 'Condiciones del anticrético'}</h4><div className="options-grid"><label><input type="checkbox" checked={formData.furnished !== 'UNFURNISHED'} onChange={e => setFormData(prev => ({ ...prev, furnished: e.target.checked ? 'FULLY_FURNISHED' : 'UNFURNISHED' }))} /> Amoblado</label><label><input type="checkbox" checked={formData.petsAllowed} onChange={e => setFormData(prev => ({ ...prev, petsAllowed: e.target.checked }))} /> Se permiten mascotas</label><label><input type="checkbox" checked={formData.expensesIncluded} onChange={e => setFormData(prev => ({ ...prev, expensesIncluded: e.target.checked }))} /> Expensas incluidas</label><label><input type="checkbox" checked={formData.wifiIncluded} onChange={e => setFormData(prev => ({ ...prev, wifiIncluded: e.target.checked }))} /> Wifi incluido</label><label className="commission-field">Comisión a pagar (%)<input type="number" min="0" max="100" step="0.1" value={formData.commissionPercentage} onChange={e => setFormData(prev => ({ ...prev, commissionPercentage: Number(e.target.value) }))} /></label></div></div>}
      </section>
      <section className="form-section"><div className="form-section-heading"><span className="step-number">02</span><div><h3>Ubicación y características</h3><p>Ayuda a los interesados a saber si este es su próximo espacio.</p></div></div>
        <div className="property-fields">{field('address','Dirección',true)}{field('city','Ciudad',true)}{field('region','Región o departamento',true)}{field('areaSquareMeters','Superficie (m²)')}{field('bedrooms','Habitaciones')}{field('bathrooms','Baños')}</div>
        <div className="location-settings">
          <label className="exclusive-toggle"><input type="checkbox" checked={formData.isExclusive} onChange={e => {
            const isExclusive = e.target.checked
            setFormData(prev => ({ ...prev, isExclusive, locationMode: 'RADIUS', latitude: null, longitude: null }))
          }} /> Tengo la exclusiva de esta propiedad</label>
          <p>{formData.isExclusive ? 'Puedes publicar la ubicación exacta o mantenerla dentro de una zona.' : 'Sin exclusiva se publica únicamente una zona aproximada.'}</p>
          <div className="property-fields mt-4">
            <div><label htmlFor="location-mode" className={LABEL_CLASS}>Mostrar ubicación como</label>
              <select id="location-mode" className={INPUT_CLASS} value={formData.locationMode} disabled={!formData.isExclusive} onChange={e => setFormData(prev => ({ ...prev, locationMode: e.target.value as 'EXACT' | 'RADIUS', latitude: null, longitude: null }))}>
                <option value="RADIUS">Zona con radio</option>{formData.isExclusive && <option value="EXACT">Marcador exacto</option>}
              </select>
            </div>
            {formData.locationMode === 'RADIUS' && <div><label htmlFor="location-radius" className={LABEL_CLASS}>Radio de la zona (metros)</label>
              <select id="location-radius" className={INPUT_CLASS} value={formData.locationRadiusMeters} onChange={e => setFormData(prev => ({ ...prev, locationRadiusMeters: Number(e.target.value) }))}>
                {Array.from(new Set([100, 200, 300, 500, 1000, 2000, 5000, formData.locationRadiusMeters])).sort((a,b) => a-b).map(radius => <option key={radius} value={radius}>{radius} m</option>)}
              </select>
            </div>}
          </div>
          <PropertyLocationMap value={formData} city={formData.city} onChange={coordinates => setFormData(prev => ({ ...prev, ...coordinates }))} />
          {formData.locationMode === 'RADIUS' && <p>La dirección escrita queda disponible para gestionar tu publicación. Los demás usuarios verán la zona. Evita incluir la dirección exacta en el título, la descripción o las fotografías.</p>}
        </div>
        <div className="mt-6"><label htmlFor="property-description" className={LABEL_CLASS}>Descripción</label><textarea id="property-description" name="description" value={formData.description} onChange={handleChange} rows={4} className={INPUT_CLASS} placeholder="Cuéntanos qué hace especial a esta propiedad: distribución, servicios y lugares cercanos." /></div>
      </section>
      <section className="form-section"><div className="form-section-heading"><span className="step-number">03</span><div><h3>Fotografías</h3><p>La primera imagen será la portada. Puedes agregar más de una.</p></div></div>
        <div className="upload-zone"><label htmlFor="property-images" className={LABEL_CLASS}>Agregar fotografías</label><input id="property-images" type="file" multiple accept="image/*" onChange={handleImageSelect} className="w-full text-sm" /><p>Imágenes de hasta 5 MB cada una.</p></div>
        {(existingImages.length > 0 || images.length > 0) && <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {existingImages.map((url,index) => <div key={url} className="relative"><img src={url} alt={`Fotografía ${index+1}`} className="w-full h-24 object-cover rounded" /><button type="button" onClick={() => handleRemoveExistingImage(url)} aria-label={`Quitar fotografía ${index+1}`} className="absolute top-1 right-1 bg-white text-red-700 rounded-full w-10 h-10">×</button></div>)}
          {images.map((file,index) => <div key={index} className="relative"><img src={previews[index]} alt={file.name} className="w-full h-24 object-cover rounded" /><button type="button" onClick={() => handleRemoveImage(index)} aria-label={`Quitar ${file.name}`} className="absolute top-1 right-1 bg-white text-red-700 rounded-full w-10 h-10">×</button></div>)}
        </div>}
      </section>
      <div className="form-actions"><p>{isLoading ? 'Estamos guardando los datos y las fotografías…' : 'Revisa la información antes de guardar.'}</p><button type="submit" disabled={isLoading || success} className="button button-primary">{isLoading ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Publicar propiedad'}</button></div>
    </fieldset>
    {!isLoading && <Link to="/properties" className="text-link mt-4">Volver a mis propiedades</Link>}
  </form>
}
