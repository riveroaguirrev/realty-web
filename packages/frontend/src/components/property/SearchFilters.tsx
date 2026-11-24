import { FilterSelect } from '@/components/ui/FilterSelect'
import { CityAutocomplete } from './CityAutocomplete'
import { boundsForPlace } from '@/utils/searchLocation'
import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { PROPERTY_TYPES } from '@/utils/propertyPresentation'
export interface SearchFilters { location?: string; west?: number; south?: number; east?: number; north?: number; operation?: string; currency?: string; city?: string; region?: string; type?: string; priceMin?: number; priceMax?: number; bedroomsMin?: number; bedroomsMax?: number; bathroomsMin?: number; bathroomsMax?: number; areaMin?: number; areaMax?: number }
interface SearchFiltersProps { compact?: boolean; applySelectsImmediately?: boolean; onSearch: (filters: SearchFilters) => void; isLoading?: boolean; initialFilters?: SearchFilters }
export const SearchFiltersComponent = ({ onSearch, isLoading = false, initialFilters = {}, compact = false, applySelectsImmediately = false }: SearchFiltersProps) => {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [error, setError] = useState('')
  const change = (key: keyof SearchFilters, value: string, numeric = false) => {
    const next = { ...filters, [key]: value === '' ? undefined : numeric ? Number(value) : value }
    setFilters(next)
    if (applySelectsImmediately && ['type', 'operation', 'currency'].includes(key)) {
      const ranges = [['priceMin','priceMax'],['bedroomsMin','bedroomsMax'],['bathroomsMin','bathroomsMax'],['areaMin','areaMax']] as const
      if (ranges.some(([min,max]) => next[min] != null && next[max] != null && next[min]! > next[max]!)) {
        setError('El valor mínimo no puede superar al máximo. Revisa los rangos.')
        return
      }
      setError('')
      onSearch(next)
    }
  }
  const numberField = (key: keyof SearchFilters, label: string, placeholder = 'Sin límite') => <div className="field" key={key}>{compact && key === 'priceMax' && <svg className="search-field-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" aria-hidden="true"><path d="M3 3h8l10 10-8 8L3 11Z"/><circle cx="7.5" cy="7.5" r="1"/></svg>}<label htmlFor={`filter-${key}`}>{label}</label><input id={`filter-${key}`} type="number" min="0" step="any" value={filters[key] ?? ''} placeholder={placeholder} onChange={e => change(key, e.target.value, true)} /></div>
  return <form className="filter-panel" onSubmit={e => { e.preventDefault(); const ranges = [['priceMin','priceMax'],['bedroomsMin','bedroomsMax'],['bathroomsMin','bathroomsMax'],['areaMin','areaMax']] as const; if (ranges.some(([min,max]) => filters[min] != null && filters[max] != null && filters[min]! > filters[max]!)) { setError('El valor mínimo no puede superar al máximo. Revisa los rangos.'); setShowAdvanced(true); return } setError(''); onSearch(filters) }}>
    <div className="filter-basic"><div className="field">{compact && <Icon name="pin" className="search-field-icon" />}<CityAutocomplete id="filter-city" label={compact ? 'Ubicación' : '¿Dónde buscas?'} required={false} includeZones value={filters.location || filters.city || ''} placeholder={compact ? 'Buscar ciudad o zona' : 'Ciudad o zona, por ejemplo Cochabamba'} onChange={value => setFilters(previous => ({ ...previous, city: value || undefined, location: undefined, west: undefined, south: undefined, east: undefined, north: undefined }))} onSelect={place => {
      const next = { ...filters, city: undefined, region: undefined, location: place.place_name, ...boundsForPlace(place) }
      setFilters(next)
      const ranges = [['priceMin','priceMax'],['bedroomsMin','bedroomsMax'],['bathroomsMin','bathroomsMax'],['areaMin','areaMax']] as const
      if (ranges.some(([min,max]) => next[min] != null && next[max] != null && next[min]! > next[max]!)) { setError('El valor mínimo no puede superar al máximo. Revisa los rangos.'); return }
      setError('')
      onSearch(next)
    }} /></div><div className="field">{compact && <Icon name="building" className="search-field-icon" />}<label htmlFor="filter-type">{compact ? 'Tipo' : 'Tipo de propiedad'}</label><FilterSelect id="filter-type" label="Tipo de propiedad" value={filters.type || ''} options={[['', 'Todos los tipos'], ...Object.entries(PROPERTY_TYPES)]} onChange={value => change('type',value)} /></div>{numberField('priceMax',compact ? 'Presupuesto' : 'Presupuesto máximo', compact ? 'Presupuesto máximo' : 'Sin límite')}<button className="button button-primary" type="submit" disabled={isLoading}><Icon name="search" />{isLoading ? 'Buscando…' : compact ? 'Buscar' : 'Buscar propiedades'}</button></div>
    <div className="filter-toolbar">{compact && <div className="search-operation-tabs" role="group" aria-label="Operación">{[['','Todos'],['SALE','Venta'],['RENTAL','Alquiler'],['ANTICRETIC','Anticrético']].map(([value,label]) => <button key={value} type="button" aria-pressed={(filters.operation || '') === value} onClick={() => change('operation', value)}>{label}</button>)}</div>}<button type="button" className="text-link" aria-expanded={showAdvanced} aria-controls="advanced-filters" onClick={() => setShowAdvanced(!showAdvanced)}><Icon name="filter" />{showAdvanced ? 'Ocultar filtros' : compact ? 'Filtros' : 'Más filtros'}</button><button type="button" className="text-link muted" disabled={isLoading} onClick={() => { setFilters({}); setError(''); onSearch({}) }}>{compact ? 'Limpiar' : 'Limpiar filtros'}</button></div>
    {showAdvanced && <div id="advanced-filters" className="filter-advanced">{!compact && <div className="field"><label htmlFor="filter-operation">Operación</label><FilterSelect id="filter-operation" label="Operación" value={filters.operation || ''} options={[["", "Todas las operaciones"], ["SALE", "Venta"], ["RENTAL", "Alquiler"], ["ANTICRETIC", "Anticrético"]]} onChange={value => change('operation', value)} /></div>}<div className="field"><label htmlFor="filter-currency">Moneda</label><FilterSelect id="filter-currency" label="Moneda" value={filters.currency || ''} options={[["", "Todas las monedas"], ["USD", "Dólares (USD)"], ["BOB", "Bolivianos (BOB)"]]} onChange={value => change('currency', value)} /></div><div className="field"><label htmlFor="filter-region">Región</label><input id="filter-region" value={filters.region || ''} onChange={e => change('region',e.target.value)} placeholder="Todas las regiones" /></div>{numberField('priceMin','Precio mínimo')}{numberField('bedroomsMin','Habitaciones mínimas')}{numberField('bedroomsMax','Habitaciones máximas')}{numberField('bathroomsMin','Baños mínimos')}{numberField('bathroomsMax','Baños máximos')}{numberField('areaMin','Superficie mínima (m²)')}{numberField('areaMax','Superficie máxima (m²)')}</div>}{error && <p role="alert" className="form-error">{error}</p>}
  </form>
}
