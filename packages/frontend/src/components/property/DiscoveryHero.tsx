import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CityAutocomplete } from './CityAutocomplete'
import type { SearchFilters } from './SearchFilters'
import { Icon } from '@/components/ui/Icon'
import { PROPERTY_TYPES } from '@/utils/propertyPresentation'
import { boundsForPlace } from '@/utils/searchLocation'
import './DiscoveryHero.css'

function HeroSelect({ id, label, value, options, onChange }: { id: string; label: string; value: string; options: [string, string][]; onChange: (value: string) => void }) {
  const ref = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    const close = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) ref.current?.removeAttribute('open') }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])
  return <details ref={ref} className="hero-dropdown" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) event.currentTarget.removeAttribute('open') }} onKeyDown={event => { if (event.key === 'Escape') { ref.current?.removeAttribute('open'); ref.current?.querySelector('summary')?.focus() } }}>
    <summary aria-label={`${label}: ${options.find(option => option[0] === value)?.[1]}`}><span className="hero-dropdown-label">{label}</span><span className="hero-dropdown-value">{options.find(option => option[0] === value)?.[1]}<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m7 10 5 5 5-5" /></svg></span></summary>
    <div className="hero-dropdown-options" role="group" aria-label={label}>{options.map(([key, text]) => <label key={key} className={value === key ? 'is-selected' : ''}><input type="radio" name={id} value={key} checked={value === key} onChange={() => onChange(key)} /><span>{text}</span>{value === key && <span aria-hidden="true">✓</span>}</label>)}</div>
  </details>
}

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
        <HeroSelect id="discovery-operation" label="Operación" value={filters.operation || ''} options={[[ '', 'Todas'], ['SALE', 'Venta'], ['RENTAL', 'Alquiler'], ['ANTICRETIC', 'Anticrético']]} onChange={operation => setFilters(previous => ({ ...previous, operation }))} />
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
        <HeroSelect id="discovery-type" label="Tipo de inmueble" value={filters.type || ''} options={[[ '', 'Todos'], ...Object.entries(PROPERTY_TYPES)]} onChange={type => setFilters(previous => ({ ...previous, type }))} />
      </div>
      <button type="submit" className="discovery-submit"><Icon name="search" />Buscar</button>
    </form>
  </section>
}
