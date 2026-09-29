import { FormEvent, useState } from 'react'
import { propertyAPI } from '@/services/property'
import { getErrorMessage } from '@/utils/errorMessage'
import { PROPERTY_STATUS_OPTIONS } from '@/utils/propertyStatus'

const NUMERIC_FIELDS = ['price', 'bedrooms', 'bathrooms', 'areaSquareMeters']
const REDIRECT_DELAY_MS = 1500
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
      setImages(Array.from(e.target.files))
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
        throw new Error(`Could not upload "${file.name}": ${getErrorMessage(err, 'upload failed')}`)
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
        setTimeout(onSubmit, REDIRECT_DELAY_MS)
      }
    } catch (err) {
      setError(getErrorMessage(err, `Failed to ${isEditing ? 'update' : 'create'} property`))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        {isEditing ? 'Edit Property' : 'List a Property'}
      </h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          {isEditing ? 'Property updated!' : 'Property listed successfully!'} Redirecting...
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className={LABEL_CLASS}>Title</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className={INPUT_CLASS}
            required
          />
        </div>

        <div>
          <label className={LABEL_CLASS}>Price</label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            className={INPUT_CLASS}
            required
          />
        </div>

        <div>
          <label className={LABEL_CLASS}>Type</label>
          <select name="type" value={formData.type} onChange={handleChange} className={INPUT_CLASS}>
            <option>RESIDENTIAL</option>
            <option>HOUSE</option>
            <option>APARTMENT</option>
            <option>COMMERCIAL</option>
            <option>OFFICE</option>
            <option>INDUSTRIAL</option>
            <option>LAND</option>
          </select>
        </div>

        {isEditing && (
          <div>
            <label className={LABEL_CLASS}>Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className={INPUT_CLASS}
            >
              {PROPERTY_STATUS_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className={LABEL_CLASS}>Address</label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className={INPUT_CLASS}
            required
          />
        </div>

        <div>
          <label className={LABEL_CLASS}>City</label>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleChange}
            className={INPUT_CLASS}
            required
          />
        </div>

        <div>
          <label className={LABEL_CLASS}>Region</label>
          <input
            type="text"
            name="region"
            value={formData.region}
            onChange={handleChange}
            className={INPUT_CLASS}
            required
          />
        </div>

        <div>
          <label className={LABEL_CLASS}>Bedrooms</label>
          <input
            type="number"
            name="bedrooms"
            value={formData.bedrooms}
            onChange={handleChange}
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label className={LABEL_CLASS}>Bathrooms</label>
          <input
            type="number"
            name="bathrooms"
            value={formData.bathrooms}
            onChange={handleChange}
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label className={LABEL_CLASS}>Area (m²)</label>
          <input
            type="number"
            name="areaSquareMeters"
            value={formData.areaSquareMeters}
            onChange={handleChange}
            className={INPUT_CLASS}
          />
        </div>
      </div>

      <div className="mt-6">
        <label className={LABEL_CLASS}>Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={4}
          className={INPUT_CLASS}
        />
      </div>

      <div className="mt-6">
        <label className={LABEL_CLASS}>Images</label>

        {existingImages.length > 0 && (
          <div className="mb-4 grid grid-cols-4 gap-4">
            {existingImages.map((url) => (
              <div key={url} className="relative">
                <img src={url} alt="current" className="w-full h-24 object-cover rounded" />
                <button
                  type="button"
                  onClick={() => handleRemoveExistingImage(url)}
                  aria-label="Remove image"
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleImageSelect}
          className={INPUT_CLASS}
        />
        {images.length > 0 && (
          <div className="mt-4 grid grid-cols-4 gap-4">
            {images.map((file, index) => (
              <div key={index} className="relative">
                <img
                  src={URL.createObjectURL(file)}
                  alt={`preview-${index}`}
                  className="w-full h-24 object-cover rounded"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  aria-label="Remove new image"
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="mt-6 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'List Property'}
      </button>
    </form>
  )
}
