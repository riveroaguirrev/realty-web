import type { RequirementInput } from '@shared/types/requirements'

export const REQUIREMENT_STEPS = ['Información', 'Ubicación y precio', 'Características', 'Revisión'] as const
export interface RequirementStepIssue { message: string; field: string }

export function validateRequirementStep(step: number, data: RequirementInput, openBudget: boolean): RequirementStepIssue | null {
  if (step === 0) {
    if (data.title.trim().length < 5 || data.title.trim().length > 180) return { message: 'Escribe un título de entre 5 y 180 caracteres.', field: 'requirement-title' }
    if ((data.description?.length ?? 0) > 3000) return { message: 'Las características y condiciones admiten hasta 3000 caracteres.', field: 'requirement-description' }
  }
  if (step === 1) {
    if (!data.cities.length) return { message: 'Indica al menos una ciudad.', field: 'requirement-city' }
    for (const [key, field] of [['cities', 'city'], ['zones', 'zones']] as const) {
      if (data[key].length > 12 || data[key].some(value => value.length > 100)) return { message: 'Indica hasta 12 alternativas de máximo 100 caracteres cada una.', field: `requirement-${field}` }
    }
    if (!openBudget) {
      if (data.priceMin == null && data.priceMax == null) return { message: 'Indica un presupuesto o selecciona presupuesto abierto.', field: 'requirement-max' }
      for (const [key, field] of [['priceMin', 'min'], ['priceMax', 'max']] as const) {
        const amount = data[key]
        if (amount != null && (!Number.isFinite(amount) || amount < 0 || amount > 9999999999)) return { message: 'Indica un presupuesto válido mayor o igual a cero.', field: `requirement-${field}` }
      }
      if (data.priceMin != null && data.priceMax != null && data.priceMin > data.priceMax) return { message: 'El presupuesto máximo debe ser mayor o igual al mínimo.', field: 'requirement-max' }
    }
  }
  if (step === 2) {
    for (const [key, field] of [['bedroomsMin', 'bedrooms'], ['bathroomsMin', 'bathrooms']] as const) {
      const count = data[key]
      if (count != null && (!Number.isInteger(count) || count < 0 || count > 100)) return { message: 'Usa un número entero entre 0 y 100.', field: `requirement-${field}` }
    }
    if (data.areaMin != null && (!Number.isFinite(data.areaMin) || data.areaMin <= 0 || data.areaMin > 10000000)) return { message: 'Indica una superficie mayor que cero.', field: 'requirement-area' }
  }
  return null
}
