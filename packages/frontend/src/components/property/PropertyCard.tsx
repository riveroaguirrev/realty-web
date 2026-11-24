import { Link } from 'react-router-dom'
import { useRef, useState, type MouseEvent } from 'react'
import { Icon } from '@/components/ui/Icon'
import { formatPrice, PROPERTY_TYPES } from '@/utils/propertyPresentation'
import './PropertyCard.css'

export interface PropertyCardProps {
  id: string; title: string; price: number; currency?: string; type: string; city: string
  operation?: 'SALE' | 'RENTAL' | 'ANTICRETIC'; bedrooms?: number; bathrooms?: number; areaSquareMeters?: number; images?: string[]; onClick?: () => void
}

const PropertyCover = ({ id, title, type, images, operationLabel, onClick }: Pick<PropertyCardProps, 'id' | 'title' | 'type' | 'onClick'> & { images: string[]; operationLabel: string }) => {
  const [index, setIndex] = useState(0)
  const [failedImages, setFailedImages] = useState<Set<number>>(() => new Set())
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const ignoreClickUntil = useRef(0)
  const changePhoto = (direction: number) => setIndex(current => (current + direction + images.length) % images.length)
  const navigate = (event: MouseEvent<HTMLAnchorElement>) => {
    if (Date.now() < ignoreClickUntil.current) { event.preventDefault(); return }
    onClick?.()
  }
  const dotStart = Math.min(Math.max(index - 2, 0), Math.max(images.length - 5, 0))
  return <div className="property-cover" onTouchStart={event => {
    const touch = event.touches[0]
    touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null
  }} onTouchEnd={event => {
    const touch = event.changedTouches[0]
    if (touchStart.current && touch && images.length > 1) {
      const dx = touch.clientX - touchStart.current.x
      const dy = touch.clientY - touchStart.current.y
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
        if (event.cancelable) event.preventDefault()
        ignoreClickUntil.current = Date.now() + 500
        changePhoto(dx < 0 ? 1 : -1)
      }
    }
    touchStart.current = null
  }}>
    <Link to={`/properties/${id}`} className="property-cover-link" onClick={navigate} aria-label={`Ver ${title}${images.length ? `, foto ${index + 1} de ${images.length}` : ''}`}>
      {images[index] && !failedImages.has(index)
        ? <img key={images[index]} src={images[index]} alt={`${title} · foto ${index + 1}`} loading="lazy" onError={() => setFailedImages(current => new Set(current).add(index))} />
        : <div className="property-placeholder"><Icon name="home" width="42" height="42" /><span>{images.length ? 'Foto no disponible' : 'Fotografías próximamente'}</span></div>}
    </Link>
    <span className="property-operation-badge">{operationLabel}</span>
    {type && <span className="property-type">{PROPERTY_TYPES[type] || type}</span>}
    {!!images.length && <span className="property-photo-count"><Icon name="photos" width="15" height="15" />{images.length} {images.length === 1 ? 'foto' : 'fotos'}</span>}
    {images.length > 1 && <div className="property-gallery-controls" role="group" aria-label={`Fotos de ${title}`}>
      <button type="button" className="property-gallery-arrow is-previous" aria-label={`Foto anterior de ${title}`} onClick={() => changePhoto(-1)}><Icon name="chevronLeft" width="18" height="18" /></button>
      <button type="button" className="property-gallery-arrow is-next" aria-label={`Foto siguiente de ${title}`} onClick={() => changePhoto(1)}><Icon name="chevronRight" width="18" height="18" /></button>
      <div className="property-gallery-dots">{images.slice(dotStart, dotStart + 5).map((_, offset) => {
        const dotIndex = dotStart + offset
        return <button key={dotIndex} type="button" aria-label={`Mostrar foto ${dotIndex + 1} de ${title}`} aria-pressed={index === dotIndex} onClick={() => setIndex(dotIndex)}><span /></button>
      })}</div>
      <span className="sr-only" role="status" aria-live="polite">Foto {index + 1} de {images.length}</span>
    </div>}
  </div>
}

export const PropertyCard = ({ id, title, price, currency, type, city, operation, bedrooms, bathrooms, areaSquareMeters, images, onClick }: PropertyCardProps) => {
  const photos = (images || []).filter(image => typeof image === 'string' && image.trim())
  const operationLabel = operation === 'RENTAL' ? 'Alquiler' : operation === 'ANTICRETIC' ? 'Anticrético' : 'Venta'
  return <article className="property-card realty-property-card" data-operation={operation || 'SALE'}>
    <PropertyCover key={`${id}:${JSON.stringify(photos)}`} id={id} title={title} type={type} images={photos} operationLabel={operationLabel} onClick={onClick} />
    <div className="property-body">
      <Link to={`/properties/${id}`} onClick={onClick} className="property-summary-link">
        <p className="property-price">{formatPrice(price, currency)}</p>
        <h3>{title}</h3>
        {city && <p className="property-location"><Icon name="pin" width="17" height="19" />{city}</p>}
      </Link>
      {(bedrooms != null || bathrooms != null || areaSquareMeters != null) && <div className="property-specs">
        {bedrooms != null && <span><span className="property-spec-icon spec-bed"><Icon name="bed" width="19" height="19" /></span><span><strong>{bedrooms}</strong> hab.</span></span>}
        {bathrooms != null && <span><span className="property-spec-icon spec-bath"><Icon name="bath" width="19" height="19" /></span><span><strong>{bathrooms}</strong> {Number(bathrooms) === 1 ? 'baño' : 'baños'}</span></span>}
        {areaSquareMeters != null && <span><span className="property-spec-icon spec-area"><Icon name="area" width="19" height="19" /></span><span><strong>{Number(areaSquareMeters).toLocaleString('es-BO', { maximumFractionDigits: 2 })}</strong> m²</span></span>}
      </div>}
      <Link to={`/properties/${id}`} onClick={onClick} className="property-card-cta"><span>Ver propiedad</span><Icon name="arrow" width="19" height="19" /></Link>
    </div>
  </article>
}
