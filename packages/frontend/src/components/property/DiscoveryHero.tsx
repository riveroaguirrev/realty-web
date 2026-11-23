import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CityAutocomplete } from './CityAutocomplete'
import type { SearchFilters } from './SearchFilters'
import { Icon } from '@/components/ui/Icon'
import { PROPERTY_TYPES } from '@/utils/propertyPresentation'
import { boundsForPlace } from '@/utils/searchLocation'
import './DiscoveryHero.css'

export function DiscoveryHero() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<SearchFilters>({ operation: 'SALE' })

  return <section className="discovery-hero" aria-labelledby="discovery-title">
    <div className="discovery-hero-visual" aria-hidden="true">
      <img src="/images/discovery-interior.webp" alt="" fetchPriority="high" />
    </div>
    <span className="discovery-location"><Icon name="pin" />Cochabamba, Bolivia</span>
    <div className="discovery-copy">
      <span className="discovery-eyebrow">TU PRÓXIMO LUGAR EMPIEZA AQUÍ</span>
      <h2 id="discovery-title">Encuentra el espacio<br />para tu próxima historia.</h2>
      <p>Propiedades que conectan con lo que buscas.</p>
    </div>
    <form className="discovery-search" role="search" aria-label="Buscar propiedades" onSubmit={event => {
      event.preventDefault()
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && String(value).trim()) params.set(key, String(value).trim())
      })
      navigate(`/search?${params.toString()}`)
    }}>
      <div className="discovery-field discovery-select">
        <label htmlFor="discovery-operation">Operación</label>
        <select id="discovery-operation" value={filters.operation || ''} onChange={event => setFilters(previous => ({ ...previous, operation: event.target.value }))}>
          <option value="">Todas</option>
          <option value="SALE">Comprar</option>
          <option value="RENTAL">Alquilar</option>
          <option value="ANTICRETIC">Anticrético</option>
        </select>
      </div>
      <div className="discovery-field discovery-city">
        <Icon name="pin" />
        <CityAutocomplete id="discovery-city" label="Ubicación" required={false} includeZones placeholder="Ciudad o zona"
          value={filters.location || filters.city || ''}
          onChange={value => setFilters(previous => ({ ...previous, city: value, location: undefined, west: undefined, south: undefined, east: undefined, north: undefined }))}
          onSelect={place => setFilters(previous => ({ ...previous, city: undefined, location: place.place_name, ...boundsForPlace(place) }))} />
      </div>
      <div className="discovery-field discovery-select discovery-type">
        <Icon name="home" />
        <label htmlFor="discovery-type">Tipo de inmueble</label>
        <select id="discovery-type" value={filters.type || ''} onChange={event => setFilters(previous => ({ ...previous, type: event.target.value }))}>
          <option value="">Todos</option>
          {Object.entries(PROPERTY_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      <button type="submit" className="discovery-submit"><Icon name="search" />Buscar</button>
    </form>
  </section>
}
