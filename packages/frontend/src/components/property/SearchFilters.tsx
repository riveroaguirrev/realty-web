import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { PROPERTY_TYPES } from '@/utils/propertyPresentation'
export interface SearchFilters { operation?: string; currency?: string; city?: string; region?: string; type?: string; priceMin?: number; priceMax?: number; bedroomsMin?: number; bedroomsMax?: number; bathroomsMin?: number; bathroomsMax?: number; areaMin?: number; areaMax?: number }
interface SearchFiltersProps { applySelectsImmediately?: boolean; onSearch: (filters: SearchFilters) => void; isLoading?: boolean; initialFilters?: SearchFilters }
export const SearchFiltersComponent = ({ onSearch, isLoading = false, initialFilters = {}, applySelectsImmediately = false }: SearchFiltersProps) => {
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
  const numberField = (key: keyof SearchFilters, label: string, placeholder = 'Sin límite') => <div className="field" key={key}><label htmlFor={`filter-${key}`}>{label}</label><input id={`filter-${key}`} type="number" min="0" step="any" value={filters[key] ?? ''} placeholder={placeholder} onChange={e => change(key, e.target.value, true)} /></div>
  return <form className="filter-panel" onSubmit={e => { e.preventDefault(); const ranges = [['priceMin','priceMax'],['bedroomsMin','bedroomsMax'],['bathroomsMin','bathroomsMax'],['areaMin','areaMax']] as const; if (ranges.some(([min,max]) => filters[min] != null && filters[max] != null && filters[min]! > filters[max]!)) { setError('El valor mínimo no puede superar al máximo. Revisa los rangos.'); setShowAdvanced(true); return } setError(''); onSearch(filters) }}>
    <div className="filter-basic"><div className="field"><label htmlFor="filter-city">¿Dónde buscas?</label><input id="filter-city" value={filters.city || ''} placeholder="Ciudad, por ejemplo La Paz" onChange={e => change('city',e.target.value)} /></div><div className="field"><label htmlFor="filter-type">Tipo de propiedad</label><select id="filter-type" value={filters.type || ''} onChange={e => change('type',e.target.value)}><option value="">Todos los tipos</option>{Object.entries(PROPERTY_TYPES).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></div>{numberField('priceMax','Presupuesto máximo')}<button className="button button-primary" type="submit" disabled={isLoading}><Icon name="search" />{isLoading ? 'Buscando…' : 'Buscar propiedades'}</button></div>
    <div className="filter-toolbar"><button type="button" className="text-link" aria-expanded={showAdvanced} aria-controls="advanced-filters" onClick={() => setShowAdvanced(!showAdvanced)}><Icon name="filter" />{showAdvanced ? 'Ocultar filtros' : 'Más filtros'}</button><button type="button" className="text-link muted" disabled={isLoading} onClick={() => { setFilters({}); setError(''); onSearch({}) }}>Limpiar filtros</button></div>
    {showAdvanced && <div id="advanced-filters" className="filter-advanced"><div className="field"><label htmlFor="filter-operation">Operación</label><select id="filter-operation" value={filters.operation || ''} onChange={e => change('operation', e.target.value)}><option value="">Todas las operaciones</option><option value="SALE">Venta</option><option value="RENTAL">Alquiler</option><option value="ANTICRETIC">Anticrético</option></select></div><div className="field"><label htmlFor="filter-currency">Moneda</label><select id="filter-currency" value={filters.currency || ''} onChange={e => change('currency', e.target.value)}><option value="">Todas las monedas</option><option value="USD">Dólares (USD)</option><option value="BOB">Bolivianos (BOB)</option></select></div><div className="field"><label htmlFor="filter-region">Región</label><input id="filter-region" value={filters.region || ''} onChange={e => change('region',e.target.value)} placeholder="Todas las regiones" /></div>{numberField('priceMin','Precio mínimo')}{numberField('bedroomsMin','Habitaciones mínimas')}{numberField('bedroomsMax','Habitaciones máximas')}{numberField('bathroomsMin','Baños mínimos')}{numberField('bathroomsMax','Baños máximos')}{numberField('areaMin','Superficie mínima (m²)')}{numberField('areaMax','Superficie máxima (m²)')}</div>}{error && <p role="alert" className="form-error">{error}</p>}
  </form>
}
