export const PROPERTY_STATUS_OPTIONS = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'UNDER_OFFER', label: 'Under offer' },
  { value: 'SOLD', label: 'Sold' },
  { value: 'RENT', label: 'For rent' },
  { value: 'ARCHIVED', label: 'Archived' },
] as const

export const getPropertyStatusLabel = (status: string): string =>
  PROPERTY_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status
