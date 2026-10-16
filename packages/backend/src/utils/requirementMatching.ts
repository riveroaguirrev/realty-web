// Never infer an amenity from missing data. Unknown details are shown for confirmation.
const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
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
export function scoreRequirement(r: Criteria, p: Candidate) {
  // These criteria are not interchangeable: no conversion of currencies or operations.
  if (p.operation !== r.operation || p.currency !== r.currency || !r.propertyType.includes(p.type)) return null
  if (r.cities.length && !r.cities.some(c => normalize(c) === normalize(p.city))) return null
  const price = Number(p.price)
  if (!Number.isFinite(price)) return null
  const reasons: string[] = ['Tipo y operación coinciden', 'En la ciudad solicitada']
  const mismatches: string[] = []
  let earned = 40
  let possible = 40
  const check = (weight: number, result: boolean | null, yes: string, no: string) => {
    possible += weight
    if (result === true) { earned += weight; reasons.push(yes) }
    else mismatches.push(result === null ? `${no}: por confirmar` : no)
  }
  if (r.priceMin != null || r.priceMax != null) {
    const min = r.priceMin == null ? 0 : Number(r.priceMin)
    const max = r.priceMax == null ? Infinity : Number(r.priceMax)
    // Slightly out-of-budget alternatives are explicit, never silently called matches.
    if (price < min * .85 || price > max * 1.15) return null
    check(25, price >= min && price <= max, 'Dentro del presupuesto', 'Fuera del presupuesto')
  } else reasons.push('Presupuesto abierto')
  if (r.zones.length) {
    const publicText = normalize(`${p.title} ${p.description || ''} ${p.region}`)
    check(20, r.zones.some(z => publicText.includes(normalize(z))) ? true : null, 'Zona mencionada en la publicación', 'Zona solicitada')
  }
  for (const [minimum, value, label, weight] of [
    [r.bedroomsMin, p.bedrooms, 'Habitaciones', 12],
    [r.bathroomsMin, p.bathrooms, 'Baños', 8],
    [r.areaMin, p.areaSquareMeters, 'Superficie', 15],
  ] as const) {
    if (minimum != null) check(weight, value == null ? null : value >= minimum, `${label}: cumple el mínimo`, `${label}: no cumple el mínimo`)
  }
  if (r.requiresGarage) check(10, p.hasGarage || (p.parking || 0) > 0, 'Tiene garaje', 'Garaje no indicado')
  if (r.petsRequired) check(10, p.petPolicy === 'RESTRICTIONS' ? null : p.petsAllowed || p.petPolicy === 'ALLOWED', 'Admite mascotas', 'Mascotas no permitidas')
  if (r.requiresGroundFloor) {
    const features = p.features && typeof p.features === 'object' ? p.features as Record<string, unknown> : {}
    const text = normalize(`${p.title} ${p.description || ''}`)
    const floor = typeof features.floor === 'number' ? features.floor === 0 : null
    check(15, floor ?? (features.groundFloor === true || /\bplanta baja\b/.test(text) ? true : null), 'Planta baja indicada', 'Planta baja')
  }
  return { propertyId: p.id, score: Math.round(earned / possible * 100), reasons, mismatches }
}
