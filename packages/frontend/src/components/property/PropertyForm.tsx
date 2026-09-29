import { FormEvent, useState } from 'react'
import { propertyAPI } from '@/services/property'
import { getErrorMessage } from '@/utils/errorMessage'

interface PropertyFormProps {
  token: string
  onSubmit?: () => void
}

export const PropertyForm = ({ token, onSubmit }: PropertyFormProps) => {
  const [formData, setFormData] = useState({
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
  })

  const [images, setImages] = useState<File[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: ['price', 'bedrooms', 'bathrooms', 'areaSquareMeters'].includes(name) ? Number(value) : value,
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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      let uploadedImages: string[] = []
      if (images.length > 0) {
        uploadedImages = await uploadImages()
      }

      await propertyAPI.createProperty(token, {
        ...formData,
        bedrooms: formData.bedrooms || undefined,
        bathrooms: formData.bathrooms || undefined,
        areaSquareMeters: formData.areaSquareMeters || undefined,
        images: uploadedImages,
      })

      setSuccess(true)
      setFormData({
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
      })
      setImages([])

      if (onSubmit) {
        setTimeout(onSubmit, 1500)
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create property'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">List a Property</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          Property listed successfully! Redirecting...
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option>RESIDENTIAL</option>
            <option>HOUSE</option>
            <option>APARTMENT</option>
            <option>COMMERCIAL</option>
            <option>OFFICE</option>
            <option>INDUSTRIAL</option>
            <option>LAND</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
          <input
            type="text"
            name="region"
            value={formData.region}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
          <input
            type="number"
            name="bedrooms"
            value={formData.bedrooms}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
          <input
            type="number"
            name="bathrooms"
            value={formData.bathrooms}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Area (m²)</label>
          <input
            type="number"
            name="areaSquareMeters"
            value={formData.areaSquareMeters}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>

      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Images</label>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleImageSelect}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
        {isLoading ? 'Listing Property...' : 'List Property'}
      </button>
    </form>
  )
}
