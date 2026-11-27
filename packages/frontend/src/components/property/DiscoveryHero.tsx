import { useState } from 'react'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { useNavigate } from 'react-router-dom'
import { CityAutocomplete } from './CityAutocomplete'
import type { SearchFilters } from './SearchFilters'
import { Icon } from '@/components/ui/Icon'
import { PROPERTY_TYPES } from '@/utils/propertyPresentation'
import { boundsForPlace } from '@/utils/searchLocation'
import './DiscoveryHero.css'

export function DiscoveryHero() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<SearchFilters>({})

  return <section className="discovery-hero" aria-labelledby="discovery-title">
    <div className="discovery-hero-visual" aria-hidden="true">
      <img src="/images/discovery-interior.webp" alt="" fetchPriority="high" />
    </div>
    <span className="discovery-location"><Icon name="pin" />Cochabamba, Bolivia</span>
    <div className="discovery-copy">
      <h2 id="discovery-title">Tu próximo cierre<br />empieza aquí.</h2>
      <p>Encuentra propiedades para tus clientes.</p>
    </div>
    <form className="discovery-search" role="search" aria-label="Buscar propiedades" onSubmit={event => {
      event.preventDefault()
      const params = new URLSearchParams({ city: 'Cochabamba' })
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && String(value).trim()) params.set(key, String(value).trim())
      })
      navigate(`/search?${params.toString()}`)
    }}>
      <div className="discovery-field discovery-select">
        <FilterSelect variant="hero" id="discovery-operation" label="Operación" value={filters.operation || ''} options={[[ '', 'Todas'], ['SALE', 'Venta'], ['RENTAL', 'Alquiler'], ['ANTICRETIC', 'Anticrético']]} onChange={operation => setFilters(previous => ({ ...previous, operation }))} />
      </div>
      <div className="discovery-field discovery-city">
        <Icon name="pin" />
        <CityAutocomplete id="discovery-city" label="Ubicación" required={false} includeZones withinCity="Cochabamba" placeholder="Zona en Cochabamba"
          value={filters.location || ''}
          onChange={value => setFilters(previous => ({ ...previous, city: 'Cochabamba', location: value || undefined, west: undefined, south: undefined, east: undefined, north: undefined }))}
          onSelect={place => setFilters(previous => ({ ...previous, city: 'Cochabamba', location: place.place_name, ...boundsForPlace(place) }))} />
      </div>
      <div className="discovery-field discovery-select discovery-type">
        <Icon name="home" />
        <FilterSelect variant="hero" id="discovery-type" label="Tipo de inmueble" value={filters.type || ''} options={[[ '', 'Todos'], ...Object.entries(PROPERTY_TYPES)]} onChange={type => setFilters(previous => ({ ...previous, type }))} />
      </div>
      <button type="submit" className="discovery-submit"><Icon name="search" />Buscar</button>
    </form>
  </section>
}
