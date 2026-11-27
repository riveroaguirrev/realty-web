import type { User } from '@shared/types'
import { PROPERTY_TYPES } from './propertyPresentation'
import { getPropertyStatusLabel } from './propertyStatus'

type Amount = number | string | null
export interface ShareableProperty {
  id: string
  advisorId: string
  title: string
  type?: string
  operation?: string
  status?: string
  description?: string | null
  price?: Amount
  currency?: string
  city?: string
  region?: string
  address?: string
  isExclusive?: boolean
  locationMode?: string
  bedrooms?: number | null
  bathrooms?: number | null
  parking?: number | null
  areaSquareMeters?: number | null
  lotSize?: number | null
  condition?: string | null
  yearBuilt?: number | null
  yearRenovated?: number | null
  furnished?: string | null
  rentalFurnished?: boolean | null
  hasGarage?: boolean
  hasGarden?: boolean
  hasPool?: boolean
  features?: Record<string, unknown> | null
  amenities?: Record<string, unknown> | null
  appliances?: string[] | null
  utilities?: Record<string, unknown> | null
  school?: string | null
  distanceToSchool?: number | null
  distanceToTransit?: number | null
  videoUrl?: string | null
  virtualTourUrl?: string | null
  petsAllowed?: boolean | null
  petPolicy?: string | null
  expensesIncluded?: boolean | null
  wifiIncluded?: boolean | null
  hoaFees?: Amount
  availableDate?: string | Date | null
  commissionPercentage?: number | null
  images?: string[] | null
}

type ShareUser = Pick<User, 'id' | 'role'>
type ShareContact = Pick<User, 'firstName' | 'lastName' | 'phone'>
export const canShareOwnProperty = (user: ShareUser | null, property: Pick<ShareableProperty, 'advisorId'>) =>
  user?.role === 'ADVISOR' && property.advisorId === user.id

const equipment: Record<string, string> = {
  stove: '🍳 Cocina', refrigerator: '🧊 Refrigerador', washer: '🧺 Lavadora', microwave: '♨️ Microondas',
  oven: '♨️ Horno', dryer: '🧺 Secadora', dishwasher: '🍽️ Lavavajillas', coffeeMaker: '☕ Cafetera', kitchenware: '🍽️ Menaje',
}
const comforts: Record<string, string> = {
  hasElevator: '🛗 Ascensor', hasSecurityGate: '🔐 Portón de seguridad', hasGym: '🏋️ Gimnasio', hasSecurity: '🛡️ Seguridad',
  balcony: '🌤️ Balcón', patio: '🌿 Patio', terrace: '🌇 Terraza', groundFloor: '🏠 Planta baja', hasGroundFloor: '🏠 Planta baja',
  hasSauna: '🧖 Sauna', sauna: '🧖 Sauna', hasBarbecue: '🔥 Parrillero', barbecue: '🔥 Parrillero',
}
const conditions: Record<string, string> = { NEW: 'Nuevo', EXCELLENT: 'Excelente', GOOD: 'Bueno', FAIR: 'Regular', NEEDS_REPAIR: 'Requiere reparación' }
const services: Record<string, string> = { electricity: '💡 Electricidad', water: '💧 Agua', internet: '📶 Internet', gas: '🔥 Gas' }
const number = (value: Amount | undefined) => value == null || value === '' ? null : Number.isFinite(Number(value)) ? Number(value) : null
const quantity = (value: number) => new Intl.NumberFormat('es-BO', { maximumFractionDigits: 2 }).format(value)
function money(value: number, currency?: string) {
  if (!currency) return quantity(value)
  try { return new Intl.NumberFormat('es-BO', { style: 'currency', currency, minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 }).format(value) }
  catch { return `${currency} ${quantity(value)}` }
}

export function propertyCommissionMessage(property: ShareableProperty): string {
  const value = property.commissionPercentage
  if (value == null || !Number.isFinite(value) || value <= 0 || value > 100) return ''
  return `🤝 Comisión${property.operation === 'RENTAL' || property.operation === 'ANTICRETIC' ? ' lado colocador' : ''}: ${quantity(value)}%`
}

export function buildPropertyShareMessage(property: ShareableProperty, contact?: ShareContact): string {
  const p = property
  const operation = p.operation === 'RENTAL' ? 'En alquiler' : p.operation === 'ANTICRETIC' ? 'En anticrético' : p.operation === 'SALE' ? 'En venta' : ''
  const title = p.title.trim() || PROPERTY_TYPES[p.type || ''] || 'Inmueble'
  const sections = [[`💫🏡 *${title.toLocaleUpperCase('es-BO')}* 🏡💫`, [operation, PROPERTY_TYPES[p.type || '']].filter(Boolean).join(' · ')].filter(Boolean).join('\n')]
  if (p.status && p.status !== 'AVAILABLE') sections.push(`📌 Estado: ${getPropertyStatusLabel(p.status)}`)
  const location = [...new Set([
    p.isExclusive && p.locationMode === 'EXACT' ? p.address?.trim() : '', p.region?.trim(), p.city?.trim(),
  ].filter(Boolean))].join(', ')
  if (location) sections.push(`📍 ${location}`)

  const price = number(p.price)
  const priceLabel = p.operation === 'RENTAL' ? 'ALQUILER' : p.operation === 'ANTICRETIC' ? 'ANTICRÉTICO' : p.operation === 'SALE' ? 'VENTA' : 'PRECIO'
  if (price != null) sections.push(`💰 *${priceLabel}: ${money(price, p.currency)}${p.operation === 'RENTAL' ? ' / mes' : ''}*`)
  if (p.areaSquareMeters != null && p.areaSquareMeters > 0) sections.push(`📐 ${quantity(p.areaSquareMeters)} m² de superficie`)

  const characteristics: string[] = []
  if (p.bedrooms != null && p.bedrooms > 0) characteristics.push(`🛏️ ${p.bedrooms} ${p.bedrooms === 1 ? 'dormitorio' : 'dormitorios'}`)
  if (p.bathrooms != null && p.bathrooms > 0) characteristics.push(`🚿 ${p.bathrooms} ${p.bathrooms === 1 ? 'baño' : 'baños'}`)
  if (p.lotSize != null && p.lotSize > 0) characteristics.push(`🌿 Terreno: ${quantity(p.lotSize)} m²`)
  if (p.parking != null && p.parking > 0) characteristics.push(`🚗 ${p.parking} ${p.parking === 1 ? 'parqueo' : 'parqueos'}`)
  else if (p.hasGarage) characteristics.push('🚗 Garaje')
  const furnished = p.furnished === 'FULLY_FURNISHED' ? 'Amoblado' : p.furnished === 'PARTIALLY_FURNISHED' ? 'Parcialmente amoblado'
    : !p.furnished && p.rentalFurnished === true ? 'Amoblado' : ''
  if (furnished && p.type !== 'LAND') characteristics.push(`🛋️ ${furnished}`)
  const amenities = new Set<string>()
  if (p.hasPool === true) amenities.add('🏊 Piscina')
  if (p.hasGarden === true) amenities.add('🌳 Jardín')
  for (const values of [p.features, p.amenities]) {
    if (values) for (const [key, label] of Object.entries(comforts)) if (values[key] === true) amenities.add(label)
  }
  characteristics.push(...amenities)
  if (p.condition && conditions[p.condition]) characteristics.push(`🏠 Estado del inmueble: ${conditions[p.condition]}`)
  if (p.yearBuilt != null && p.yearBuilt > 0) characteristics.push(`📅 Año de construcción: ${p.yearBuilt}`)
  if (p.yearRenovated != null && p.yearRenovated > 0) characteristics.push(`🔨 Año de remodelación: ${p.yearRenovated}`)
  if (characteristics.length) sections.push(`✨ *CARACTERÍSTICAS*\n${characteristics.join('\n')}`)
  if (p.description?.trim()) sections.push(`📝 *NOTAS*\n${p.description.trim()}`)
  const appliances = [...new Set((p.appliances || []).map(value => value.trim()).filter(Boolean).map(value => equipment[value] || `🍽️ ${value}`))]
  if (appliances.length) sections.push(`🍳 *EQUIPAMIENTO*\n${appliances.join('\n')}`)
  const utilities = Object.entries(services).filter(([key]) => p.utilities?.[key] === true).map(([, label]) => label)
  if (utilities.length) sections.push(`💡 *SERVICIOS*\n${utilities.join('\n')}`)

  const rules: string[] = []
  if (p.petPolicy === 'RESTRICTIONS') rules.push('🐾 Mascotas con restricciones')
  else if (p.petsAllowed === true || (p.petsAllowed == null && p.petPolicy === 'ALLOWED')) rules.push('🐾 Se permiten mascotas')
  else if (p.petsAllowed === false || p.petPolicy === 'NOT_ALLOWED') rules.push('❎ No se permiten mascotas')
  if (p.expensesIncluded === true) rules.push('🎁 Incluye expensas')
  if (p.expensesIncluded === false) {
    const fees = number(p.hoaFees)
    rules.push(`🧾 Expensas aparte${fees != null && fees > 0 ? `: ${money(fees, p.currency)}` : ''}`)
  }
  if (p.wifiIncluded === true) rules.push('📶 Wifi incluido')
  if (p.wifiIncluded === false) rules.push('📶 Wifi aparte')
  if (p.availableDate) {
    const date = new Date(p.availableDate)
    if (!Number.isNaN(date.getTime())) rules.push(`📅 Disponible desde: ${date.toLocaleDateString('es-BO', { timeZone: 'UTC' })}`)
  }
  if (rules.length) sections.push(`📋 *CONDICIONES*\n${rules.join('\n')}`)

  const nearby: string[] = []
  if (p.school?.trim()) nearby.push(`🎓 Cerca de ${p.school.trim()}${p.distanceToSchool != null && p.distanceToSchool > 0 ? `: ${quantity(p.distanceToSchool)} km` : ''}`)
  if (p.distanceToTransit != null && p.distanceToTransit > 0) nearby.push(`🚌 Transporte público a ${quantity(p.distanceToTransit)} km`)
  if (nearby.length) sections.push(`📍 *UBICACIÓN Y ENTORNO*\n${nearby.join('\n')}`)
  const media: string[] = []
  for (const [label, value] of [['🎬 Video', p.videoUrl], ['🏡 Recorrido virtual', p.virtualTourUrl]]) {
    if (value && /^https?:\/\//i.test(value)) media.push(`${label}: ${value}`)
  }
  if (media.length) sections.push(media.join('\n'))
  if (contact?.phone?.trim()) {
    const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim()
    const callToAction = !p.status || p.status === 'AVAILABLE' ? '¡AGENDA TU VISITA HOY!' : 'MÁS INFORMACIÓN'
    sections.push([`📲 *${callToAction}*`, name, `WhatsApp: 📞 ${contact.phone.trim()}`].filter(Boolean).join('\n'))
  }
  return sections.filter(Boolean).join('\n\n')
}

// The wa.me redirect can replace emojis with U+FFFD before opening WhatsApp.
export const propertyWhatsAppShareUrl = (message: string) => `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`
