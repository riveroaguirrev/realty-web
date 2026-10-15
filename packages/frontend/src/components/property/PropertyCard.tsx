import { Link } from 'react-router-dom'
import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { formatPrice, PROPERTY_TYPES } from '@/utils/propertyPresentation'
export interface PropertyCardProps {
  id: string; title: string; price: number; currency?: string; type: string; city: string
  operation?: 'SALE' | 'RENTAL' | 'ANTICRETIC'; bedrooms?: number; bathrooms?: number; areaSquareMeters?: number; images?: string[]; onClick?: () => void
}
export const PropertyCard = ({ id, title, price, currency, type, city, operation, bedrooms, bathrooms, areaSquareMeters, images, onClick }: PropertyCardProps) => {
  const [failedImage, setFailedImage] = useState(false)
  const operationLabel = operation === 'RENTAL' ? 'Alquiler' : operation === 'ANTICRETIC' ? 'Anticrético' : 'Venta'
  return <article className="property-card">
    <Link to={`/properties/${id}`} onClick={onClick} className="property-card-link">
      <div className="property-cover">
        {images?.[0] && !failedImage ? <img src={images[0]} alt={title} loading="lazy" onError={() => setFailedImage(true)} /> : <div className="property-placeholder"><Icon name="home" width="42" height="42" /><span>Fotografías próximamente</span></div>}
        <span className="property-operation-badge">{operationLabel}</span>
        <span className="property-type">{PROPERTY_TYPES[type] || type}</span>
        {images && images.length > 1 && <span className="property-photo-count">{images.length} fotos</span>}
      </div>
      <div className="property-body">
        <p className="property-price">{formatPrice(price, currency)}</p>
        <h3>{title}</h3>
        <p className="property-location"><Icon name="pin" width="15" height="15" />{city}</p>
        {(bedrooms != null || bathrooms != null || areaSquareMeters != null) && <div className="property-specs">
          {bedrooms != null && <span><Icon name="bed" width="17" height="17" /><span><strong>{bedrooms}</strong> hab.</span></span>}
          {bathrooms != null && <span><Icon name="bath" width="17" height="17" /><span><strong>{bathrooms}</strong> baños</span></span>}
          {areaSquareMeters != null && <span><Icon name="area" width="17" height="17" /><span><strong>{Number(areaSquareMeters).toLocaleString('es-BO', { maximumFractionDigits: 2 })}</strong> m²</span></span>}
        </div>}
        <div className="property-card-cta"><span>Ver propiedad</span><Icon name="arrow" width="18" height="18" /></div>
      </div>
    </Link>
  </article>
}
