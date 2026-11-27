import { useId } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PropertyStatus } from '@shared/types'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { propertyAPI } from '@/services/property'
import { getErrorMessage } from '@/utils/errorMessage'
import { PROPERTY_STATUS_OPTIONS, getPropertyStatusDescription, getPropertyStatusLabel, propertyStatusValue } from '@/utils/propertyStatus'
import './PropertyStatusControl.css'

const affectedQueries = new Set(['my-properties', 'property-detail', 'property-search', 'property-map', 'favorites', 'requirement', 'organization-advisor'])
const options: [string, string][] = PROPERTY_STATUS_OPTIONS.map(({ value, label }) => [value, label])

export function PropertyStatusControl({ token, property, compact = false }: {
  token: string; property: { id: string; title: string; status: string; visibility?: string }; compact?: boolean
}) {
  const id = useId()
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (status: PropertyStatus) => propertyAPI.updateStatus(token, property.id, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ predicate: query => affectedQueries.has(String(query.queryKey[0])) })
    },
  })

  return <div className={`property-status-control${compact ? ' is-compact' : ''}`} data-status={propertyStatusValue(property.status)} aria-busy={mutation.isPending}>
    {!compact && <label htmlFor={id}>Estado de la publicación</label>}
    <FilterSelect id={id} label={`Estado de ${property.title}`} value={propertyStatusValue(property.status)} options={options} disabled={mutation.isPending}
      onChange={value => { if (!mutation.isPending && value !== propertyStatusValue(property.status)) mutation.mutate(value as PropertyStatus) }} />
    {!compact && <p className="property-status-description">{getPropertyStatusDescription(property.status, property.visibility)}</p>}
    <span className="property-status-feedback" role="status">{mutation.isPending ? 'Guardando estado…' : mutation.isSuccess ? `Estado actualizado: ${getPropertyStatusLabel(mutation.data.status)}.` : ''}</span>
    {mutation.isError && <p className="property-status-error" role="alert">{getErrorMessage(mutation.error, 'No pudimos cambiar el estado. Inténtalo de nuevo.')}</p>}
  </div>
}
