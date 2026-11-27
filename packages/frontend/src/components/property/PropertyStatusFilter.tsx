import { FilterSelect } from '@/components/ui/FilterSelect'
import { PROPERTY_STATUS_OPTIONS } from '@/utils/propertyStatus'
import './PropertyStatusFilter.css'

const options: [string, string][] = [['', 'Todos los estados'], ...PROPERTY_STATUS_OPTIONS.map(({ value, label }): [string, string] => [value, label])]

export function PropertyStatusFilter({ value, onChange, id }: { value: string; onChange: (value: string) => void; id: string }) {
  return <div className="property-status-filter">
    <label htmlFor={id}>Estado</label>
    <FilterSelect id={id} label="Filtrar propiedades por estado" value={value} options={options} onChange={onChange} />
  </div>
}
