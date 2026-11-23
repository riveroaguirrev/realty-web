import type { RequirementMatchCriterion } from '@shared/types/requirements'

// Only requested criteria contribute. Missing property data never earns points.
const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ')
const words = (s: string) => normalize(s).replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
export const REQUIREMENT_MATCH_WEIGHTS = {
  bedrooms: 25, zone: 20, budget: 18, parking: 12, pets: 10, area: 8, preferences: 7,
} as const
interface Criteria {
  operation: string; propertyType: string[]; currency: string
  priceMin: unknown; priceMax: unknown; cities: string[]; zones: string[]
  bedroomsMin: number | null; bathroomsMin: number | null; areaMin: number | null
  requiresGarage: boolean; requiresGroundFloor: boolean; petsRequired: boolean
}
interface Candidate {
  id: string; operation: string; type: string; currency: string; price: unknown
  city: string; region: string; title: string; description: string | null
  bedrooms: number | null; bathrooms: number | null; areaSquareMeters: number | null
  hasGarage: boolean; parking: number | null; petsAllowed: boolean; petPolicy: string
  features: unknown
}
type Check = { result: boolean | null; yes: string; no: string }
const numericMinimum = (minimum: number, value: number | null, label: string): Check => ({
  result: value == null ? null : value >= minimum,
  yes: `${label}: cumple el mínimo`, no: `${label}: no cumple el mínimo`,
})

export function scoreRequirement(r: Criteria, p: Candidate) {
  // These filters establish eligibility, rather than inflating the percentage.
  if (p.operation !== r.operation || p.currency !== r.currency || !r.propertyType.includes(p.type)) return null
  if (r.cities.length && !r.cities.some(c => normalize(c) === normalize(p.city))) return null
  if (p.price == null || !Number.isFinite(Number(p.price))) return null
  const reasons: string[] = ['Tipo y operación coinciden', 'En la ciudad solicitada']
  const mismatches: string[] = []
  const breakdown: RequirementMatchCriterion[] = []
  const add = (key: RequirementMatchCriterion['key'], label: string, checks: Check[]) => {
    if (!checks.length) return
    const weight = REQUIREMENT_MATCH_WEIGHTS[key]
    const matched = checks.filter(c => c.result === true).length
    const details = checks.map(c => c.result === true ? c.yes : c.result === null ? `${c.no}: por confirmar` : c.no)
    checks.forEach((c, i) => (c.result === true ? reasons : mismatches).push(details[i]))
    breakdown.push({
      key, label, weight, earnedWeight: weight * matched / checks.length,
      status: checks.every(c => c.result === true) ? 'MATCH' : checks.some(c => c.result === false) ? 'MISMATCH' : 'UNKNOWN',
      details,
    })
  }

  if (r.bedroomsMin != null) add('bedrooms', 'Habitaciones', [numericMinimum(r.bedroomsMin, p.bedrooms, 'Habitaciones')])
  if (r.zones.length) {
    // A textual mention is a clue, not a verified geographic boundary.
    const text = ` ${words(`${p.title} ${p.description || ''} ${p.region}`)} `
    const mentioned = r.zones.some(z => !!words(z) && text.includes(` ${words(z)} `))
    add('zone', 'Zona', [{ result: mentioned ? true : null, yes: 'Zona mencionada en la publicación', no: 'Zona solicitada' }])
  }
  if (r.priceMin != null || r.priceMax != null) {
    const min = r.priceMin == null ? 0 : Number(r.priceMin)
    const max = r.priceMax == null ? Infinity : Number(r.priceMax)
    add('budget', 'Presupuesto', [{ result: Number(p.price) >= min && Number(p.price) <= max, yes: 'Dentro del presupuesto', no: 'Fuera del presupuesto' }])
  } else reasons.push('Presupuesto abierto')
  if (r.requiresGarage) add('parking', 'Parqueo', [{ result: p.hasGarage || (p.parking || 0) > 0 ? true : p.parking === 0 ? false : null, yes: 'Tiene parqueo', no: 'Parqueo no indicado' }])
  if (r.petsRequired) add('pets', 'Mascotas', [{ result: p.petPolicy === 'RESTRICTIONS' ? null : p.petsAllowed || p.petPolicy === 'ALLOWED', yes: 'Admite mascotas', no: 'Mascotas no permitidas' }])
  if (r.areaMin != null) add('area', 'Superficie', [numericMinimum(r.areaMin, p.areaSquareMeters, 'Superficie')])

  const preferences: Check[] = []
  if (r.bathroomsMin != null) preferences.push(numericMinimum(r.bathroomsMin, p.bathrooms, 'Baños'))
  if (r.requiresGroundFloor) {
    const features = p.features && typeof p.features === 'object' ? p.features as Record<string, unknown> : {}
    const text = normalize(`${p.title} ${p.description || ''}`)
    const floor = typeof features.floor === 'number' ? features.floor === 0 : null
    const groundFloor = typeof features.groundFloor === 'boolean' ? features.groundFloor : /\bplanta baja\b/.test(text) ? true : null
    preferences.push({ result: floor ?? groundFloor, yes: 'Planta baja indicada', no: 'Planta baja' })
  }
  add('preferences', 'Preferencias adicionales', preferences)

  const totalWeight = breakdown.reduce((sum, c) => sum + c.weight, 0)
  const earned = breakdown.reduce((sum, c) => sum + c.earnedWeight, 0)
  return {
    propertyId: p.id,
    score: totalWeight ? Math.round(earned / totalWeight * 100) : null,
    totalWeight, breakdown, reasons, mismatches,
  }
}
