interface PropertyCardProps {
  id: string
  title: string
  price: number
  type: string
  city: string
  bedrooms?: number
  bathrooms?: number
  areaSquareMeters?: number
  images?: string[]
  onClick?: () => void
}

export const PropertyCard = ({
  id,
  title,
  price,
  type,
  city,
  bedrooms,
  bathrooms,
  areaSquareMeters,
  images,
  onClick,
}: PropertyCardProps) => {
  return (
    <div
      className="border rounded-lg overflow-hidden shadow hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
        {images && images.length > 0 ? (
          <img src={images[0]} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="text-gray-400 text-center">No image</div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 truncate">{title}</h3>
        <p className="text-sm text-gray-600 mb-2">{city}</p>

        <div className="flex justify-between items-center mb-3">
          <span className="text-lg font-bold text-blue-600">${price.toLocaleString()}</span>
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{type}</span>
        </div>

        <div className="flex gap-4 text-sm text-gray-600 border-t pt-2">
          {bedrooms && <span>🛏️ {bedrooms} bed</span>}
          {bathrooms && <span>🛁 {bathrooms} bath</span>}
          {areaSquareMeters && <span>📐 {areaSquareMeters}m²</span>}
        </div>
      </div>
    </div>
  )
}
