export const PROPERTY_STEPS = ['Información', 'Ubicación', 'Fotografías', 'Revisión'] as const

interface PropertyDraft {
  title: string; price: number; commissionPercentage: number
  address: string; city: string; region: string
  latitude: number | null; longitude: number | null
  bedrooms: number; bathrooms: number; areaSquareMeters: number
  isExclusive: boolean; locationMode: string; locationRadiusMeters: number
}
export interface PropertyStepError { message: string; field?: string }

export function validatePropertyStep(step: number, data: PropertyDraft, imageCount: number): PropertyStepError | null {
  if (step === 0) {
    if (!data.title.trim()) return { message: 'Escribe un título para la publicación.', field: 'property-title' }
    if (!Number.isFinite(data.price) || data.price <= 0) return { message: 'El precio debe ser mayor que cero.', field: 'property-price' }
    if (!Number.isFinite(data.commissionPercentage) || data.commissionPercentage < 0 || data.commissionPercentage > 100) return { message: 'La comisión debe estar entre 0 y 100%.' }
  }
  if (step === 1) {
    for (const [field, label] of [['address', 'la dirección'], ['city', 'la ciudad'], ['region', 'la zona o barrio']] as const) {
      if (!data[field].trim()) return { message: `Completa ${label} de la propiedad.`, field: `property-${field}` }
    }
    if (data.latitude == null || data.longitude == null || !Number.isFinite(data.latitude) || !Number.isFinite(data.longitude) || Math.abs(data.latitude) > 85 || Math.abs(data.longitude) > 180) {
      return { message: 'Selecciona la ubicación o el centro de la zona en el mapa antes de continuar.', field: 'map-search' }
    }
    if ((!data.isExclusive && data.locationMode === 'EXACT') || !['EXACT', 'RADIUS'].includes(data.locationMode)) return { message: 'Revisa la modalidad de ubicación. Sin exclusiva solo puedes mostrar una zona aproximada.', field: 'location-mode' }
    if (!Number.isInteger(data.locationRadiusMeters) || data.locationRadiusMeters < 100 || data.locationRadiusMeters > 1000) return { message: 'El radio debe estar entre 100 y 1000 metros.' }
    for (const [field, label] of [['bedrooms', 'habitaciones'], ['bathrooms', 'baños']] as const) {
      if (!Number.isInteger(data[field]) || data[field] < 0) return { message: `La cantidad de ${label} debe ser un número entero positivo o cero.`, field: `property-${field}` }
    }
    if (!Number.isFinite(data.areaSquareMeters) || data.areaSquareMeters < 0) return { message: 'La superficie debe ser un número positivo o cero.', field: 'property-areaSquareMeters' }
  }
  if (step === 2 && imageCount > 20) return { message: 'Puedes agregar hasta 20 fotografías. Quita algunas antes de continuar.', field: 'property-images' }
  return null
}
