export const PROPERTY_STATUS_OPTIONS = [
  { value: 'AVAILABLE', label: 'Disponible' },
  { value: 'UNDER_OFFER', label: 'En negociación' },
  { value: 'SOLD', label: 'Vendida' },
  { value: 'RENT', label: 'En alquiler' },
  { value: 'ARCHIVED', label: 'Archivada' },
] as const

export const getPropertyStatusLabel = (status: string): string =>
  PROPERTY_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status
