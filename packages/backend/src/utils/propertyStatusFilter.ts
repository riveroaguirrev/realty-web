import type { PropertyStatus } from '@prisma/client'
import { isPropertyStatus } from '@shared/propertyStatus'
import { ApiError } from './errors'

export function readPropertyStatusFilter(value?: string | null): PropertyStatus[] | undefined {
  if (value == null || value === '') return undefined
  if (!isPropertyStatus(value)) throw new ApiError(400, 'INVALID_PROPERTY_STATUS', 'Selecciona un estado válido para filtrar las propiedades.')
  return value === 'SOLD' || value === 'RENT' ? ['SOLD', 'RENT'] : [value]
}
