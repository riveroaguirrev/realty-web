import { Link } from 'react-router-dom'
import { PROPERTY_TYPES } from '@/utils/propertyPresentation'
import { FormEvent, useState, useEffect } from 'react'
import { propertyAPI } from '@/services/property'
import { getErrorMessage } from '@/utils/errorMessage'
import { PROPERTY_STATUS_OPTIONS } from '@/utils/propertyStatus'

const NUMERIC_FIELDS = ['price', 'bedrooms', 'bathrooms', 'areaSquareMeters']
const INPUT_CLASS = 'w-full px-3 py-2 border border-gray-300 rounded-md'
const LABEL_CLASS = 'block text-sm font-medium text-gray-700 mb-1'

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
}

interface PropertyFormProps {
  token: string
  property?: EditableProperty
  onSubmit?: () => void
}

const EMPTY_FORM = {
  title: '',
  description: '',
  type: 'RESIDENTIAL',
  price: 0,
  address: '',
  city: '',
  region: '',
  bedrooms: 0,
  bathrooms: 0,
  areaSquareMeters: 0,
  status: 'AVAILABLE',
}

const toFormData = (property?: EditableProperty) =>
  property
    ? {
        title: property.title,
        description: property.description ?? '',
        type: property.type,
        price: Number(property.price),
        address: property.address,
        city: property.city,
        region: property.region,
        bedrooms: property.bedrooms ?? 0,
        bathrooms: property.bathrooms ?? 0,
        areaSquareMeters: Number(property.areaSquareMeters ?? 0),
        status: property.status ?? 'AVAILABLE',
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
    <input id={`property-${name}`} name={name} type={NUMERIC_FIELDS.includes(name) ? 'number' : 'text'} value={formData[name]} onChange={handleChange} className={INPUT_CLASS} required={required} placeholder={placeholder} min={NUMERIC_FIELDS.includes(name) ? 0 : undefined} step={name === 'price' || name === 'areaSquareMeters' ? '0.01' : undefined} />
  </div>
  return <form onSubmit={handleSubmit} className="bg-white shadow rounded-xl p-8">
    <div className="page-heading"><div><p className="eyebrow">{isEditing ? 'ACTUALIZA TU PUBLICACIÓN' : 'UNA NUEVA OPORTUNIDAD'}</p><h1>{isEditing ? 'Editar propiedad' : 'Publicar propiedad'}</h1><p>Completa los datos del inmueble. Los campos con * son obligatorios.</p></div></div>
    {error && <div role="alert" className="form-error">{error}</div>}
    {success && <p role="status" className="text-green-700 mb-4">Propiedad guardada correctamente.</p>}
    <fieldset disabled={isLoading || success}>
      <section className="form-section"><div className="form-section-heading"><span className="step-number">01</span><div><h3>Información principal</h3><p>Un título claro ayuda a encontrar tu propiedad.</p></div></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{field('title','Título de la publicación',true,'Ej. Departamento luminoso en Sopocachi')}{field('price','Precio',true)}
          <div><label htmlFor="property-type" className={LABEL_CLASS}>Tipo de propiedad *</label><select id="property-type" name="type" value={formData.type} onChange={handleChange} className={INPUT_CLASS}>{Object.entries(PROPERTY_TYPES).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          {isEditing && <div><label htmlFor="property-status" className={LABEL_CLASS}>Estado de la publicación</label><select id="property-status" name="status" value={formData.status} onChange={handleChange} className={INPUT_CLASS}>{PROPERTY_STATUS_OPTIONS.map(({value,label}) => <option key={value} value={value}>{label}</option>)}</select></div>}
        </div><p>Los precios de las nuevas publicaciones se registran en USD.</p>
      </section>
      <section className="form-section"><div className="form-section-heading"><span className="step-number">02</span><div><h3>Ubicación y características</h3><p>Ayuda a los interesados a saber si este es su próximo espacio.</p></div></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{field('address','Dirección',true)}{field('city','Ciudad',true)}{field('region','Región o departamento',true)}{field('areaSquareMeters','Superficie (m²)')}{field('bedrooms','Habitaciones')}{field('bathrooms','Baños')}</div>
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
