import { Link } from 'react-router-dom'
import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { formatPrice, PROPERTY_TYPES } from '@/utils/propertyPresentation'
export interface PropertyCardProps {
  id: string; title: string; price: number; currency?: string; type: string; city: string
  bedrooms?: number; bathrooms?: number; areaSquareMeters?: number; images?: string[]; onClick?: () => void
}
export const PropertyCard = ({ id, title, price, currency, type, city, bedrooms, bathrooms, areaSquareMeters, images, onClick }: PropertyCardProps) => {
  const [failedImage, setFailedImage] = useState(false)
  return <article className="property-card">
    <Link to={`/properties/${id}`} onClick={onClick} className="property-card-link">
      <div className="property-cover">{images?.[0] && !failedImage ? <img src={images[0]} alt={title} loading="lazy" onError={() => setFailedImage(true)} /> : <div className="property-placeholder"><Icon name="home" width="42" height="42" /><span>Fotografías próximamente</span></div>}<span className="property-type">{PROPERTY_TYPES[type] || type}</span></div>
      <div className="property-body"><p className="property-price">{formatPrice(price, currency)}</p><h3>{title}</h3><p className="property-location"><Icon name="pin" width="14" height="14" />{city}</p><div className="property-specs">{bedrooms != null && <span>{bedrooms} hab.</span>}{bathrooms != null && <span>{bathrooms} baños</span>}{areaSquareMeters != null && <span>{Number(areaSquareMeters)} m²</span>}<span className="property-open"><Icon name="arrow" width="16" /></span></div></div>
    </Link>
  </article>
}
