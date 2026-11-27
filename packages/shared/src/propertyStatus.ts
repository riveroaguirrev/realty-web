import { PropertyStatus } from './types'

// Keep the persisted codes compatible with existing properties and reports.
export const PROPERTY_STATUS_OPTIONS = [
  { value: PropertyStatus.AVAILABLE, label: 'Disponible' },
  { value: PropertyStatus.ARCHIVED, label: 'En pausa' },
  { value: PropertyStatus.UNDER_OFFER, label: 'Reservada' },
  { value: PropertyStatus.SOLD, label: 'Cerrada' },
] as const

export const isPropertyStatus = (value: unknown): value is PropertyStatus =>
  typeof value === 'string' && Object.values(PropertyStatus).includes(value as PropertyStatus)

export const propertyStatusValue = (status: string): string =>
  status === PropertyStatus.RENT ? PropertyStatus.SOLD : status

export const getPropertyStatusLabel = (status: string): string =>
  PROPERTY_STATUS_OPTIONS.find(option => option.value === propertyStatusValue(status))?.label ?? status

export function propertyStatusForOperation(status: `${PropertyStatus}`, operation: string): `${PropertyStatus}` {
  if (status === PropertyStatus.SOLD || status === PropertyStatus.RENT) {
    return operation === 'SALE' ? PropertyStatus.SOLD : PropertyStatus.RENT
  }
  return status
}

export function getPropertyStatusDescription(status: string, visibility = 'PUBLIC'): string {
  switch (propertyStatusValue(status)) {
    case PropertyStatus.AVAILABLE:
      return visibility === 'ORGANIZATION' ? 'Se ofrece solo a tu organización.' : 'Se ofrece a todos los asesores.'
    case PropertyStatus.ARCHIVED:
      return 'Oculta mientras resuelves problemas con la propiedad o el propietario.'
    case PropertyStatus.UNDER_OFFER:
      return 'Tiene una reserva pendiente de entrega. Ya no se ofrece.'
    case PropertyStatus.SOLD:
      return 'La operación finalizó y la propiedad ya fue entregada. Ya no se ofrece.'
    default:
      return ''
  }
}
