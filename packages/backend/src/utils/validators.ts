import { UserRole } from '@shared/types'
import type { PropertyStatus, PropertyType } from '@prisma/client'

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const validatePassword = (password: string): boolean => {
  return Boolean(password) && password.length >= 6
}

export const validateSignUp = (payload: any) => {
  const errors: string[] = []

  if (!payload.email || !validateEmail(payload.email)) {
    errors.push('Valid email is required')
  }

  if (!payload.password || !validatePassword(payload.password)) {
    errors.push('Password must be at least 6 characters')
  }

  if (!payload.firstName || payload.firstName.trim().length === 0) {
    errors.push('First name is required')
  }

  if (!payload.lastName || payload.lastName.trim().length === 0) {
    errors.push('Last name is required')
  }

  if (!payload.role || !Object.values(UserRole).includes(payload.role)) {
    errors.push('Valid role (ADVISOR or BUYER) is required')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export const validateLogin = (payload: any) => {
  const errors: string[] = []

  if (!payload.email || !validateEmail(payload.email)) {
    errors.push('Valid email is required')
  }

  if (!payload.password) {
    errors.push('Password is required')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

const PROPERTY_TYPES = ['RESIDENTIAL', 'COMMERCIAL', 'LAND', 'APARTMENT', 'HOUSE', 'OFFICE', 'INDUSTRIAL']
const PROPERTY_STATUSES = ['AVAILABLE', 'UNDER_OFFER', 'SOLD', 'RENT', 'ARCHIVED']
const MAX_PROPERTY_IMAGES = 20

export interface PropertyInput {
  title: string
  description?: string
  type: PropertyType
  operation: 'SALE' | 'RENTAL' | 'ANTICRETIC'
  price: number
  currency: 'USD' | 'BOB'
  furnished: 'UNFURNISHED' | 'PARTIALLY_FURNISHED' | 'FULLY_FURNISHED'
  petsAllowed: boolean
  expensesIncluded: boolean
  wifiIncluded: boolean
  commissionPercentage: number
  address: string
  city: string
  region: string
  bedrooms?: number
  bathrooms?: number
  areaSquareMeters?: number
  images: string[]
  status?: PropertyStatus
  isExclusive: boolean
  locationMode: 'EXACT' | 'RADIUS'
  locationRadiusMeters: number
  latitude: number | null
  longitude: number | null
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const isNonNegativeNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0

const validateOptionalCount = (value: unknown, label: string, errors: string[]): number | undefined => {
  if (value === undefined || value === null) return undefined
  if (!isNonNegativeNumber(value) || !Number.isInteger(value)) {
    errors.push(`${label} must be a non-negative whole number`)
    return undefined
  }
  return value
}

export const validatePropertyInput = (payload: any) => {
  const errors: string[] = []
  const body = payload ?? {}
  const operation = body.operation ?? 'SALE'
  const currency = body.currency ?? 'USD'
  const furnished = body.furnished ?? 'UNFURNISHED'
  const petsAllowed = body.petsAllowed ?? false
  const expensesIncluded = body.expensesIncluded ?? false
  const wifiIncluded = body.wifiIncluded ?? false
  const commissionPercentage = body.commissionPercentage ?? 0
  if (!['SALE', 'RENTAL', 'ANTICRETIC'].includes(operation)) errors.push('Selecciona el tipo de operación')
  if (!['USD', 'BOB'].includes(currency)) errors.push('La moneda debe ser USD o BOB')
  if (!['UNFURNISHED', 'PARTIALLY_FURNISHED', 'FULLY_FURNISHED'].includes(furnished)) errors.push('Selecciona si está amoblado')
  for (const [value, label] of [[petsAllowed, 'mascotas'], [expensesIncluded, 'expensas'], [wifiIncluded, 'wifi']] as const) {
    if (typeof value !== 'boolean') errors.push(`La opción de ${label} no es válida`)
  }
  if (typeof commissionPercentage !== 'number' || !Number.isFinite(commissionPercentage) || commissionPercentage < 0 || commissionPercentage > 100) errors.push('La comisión debe estar entre 0 y 100%')
  const isExclusive = body.isExclusive ?? false
  const locationMode = body.locationMode ?? 'RADIUS'
  const locationRadiusMeters = body.locationRadiusMeters ?? 500
  const latitude = body.latitude ?? null
  const longitude = body.longitude ?? null
  if (typeof isExclusive !== 'boolean') errors.push('Indica si la propiedad tiene exclusiva')
  if (!['EXACT', 'RADIUS'].includes(locationMode)) errors.push('Modalidad de ubicación inválida')
  if (locationMode === 'EXACT' && isExclusive !== true) errors.push('Sin exclusiva solo puedes publicar una zona con radio')
  if (!Number.isInteger(locationRadiusMeters) || locationRadiusMeters < 100 || locationRadiusMeters > 5000) {
    errors.push('El radio debe estar entre 100 y 5000 metros')
  }
  if ((latitude === null) !== (longitude === null) ||
      (latitude !== null && (typeof latitude !== 'number' || !Number.isFinite(latitude) || Math.abs(latitude) > 85)) ||
      (longitude !== null && (typeof longitude !== 'number' || !Number.isFinite(longitude) || Math.abs(longitude) > 180))) {
    errors.push('Selecciona una ubicación válida en el mapa')
  }

  if (!isNonEmptyString(body.title)) errors.push('Title is required')
  if (!isNonEmptyString(body.address)) errors.push('Address is required')
  if (!isNonEmptyString(body.city)) errors.push('City is required')
  if (!isNonEmptyString(body.region)) errors.push('Region is required')
  if (!PROPERTY_TYPES.includes(body.type)) errors.push(`Type must be one of: ${PROPERTY_TYPES.join(', ')}`)
  if (typeof body.price !== 'number' || !Number.isFinite(body.price) || body.price <= 0) {
    errors.push('Price must be greater than 0')
  }

  const bedrooms = validateOptionalCount(body.bedrooms, 'Bedrooms', errors)
  const bathrooms = validateOptionalCount(body.bathrooms, 'Bathrooms', errors)

  let areaSquareMeters: number | undefined
  if (body.areaSquareMeters !== undefined && body.areaSquareMeters !== null) {
    if (!isNonNegativeNumber(body.areaSquareMeters)) errors.push('Area must be a non-negative number')
    else areaSquareMeters = body.areaSquareMeters
  }

  if (body.status !== undefined && !PROPERTY_STATUSES.includes(body.status)) {
    errors.push(`Status must be one of: ${PROPERTY_STATUSES.join(', ')}`)
  }

  const images = body.images ?? []
  if (!Array.isArray(images) || images.length > MAX_PROPERTY_IMAGES || !images.every(isNonEmptyString)) {
    errors.push(`Images must be a list of at most ${MAX_PROPERTY_IMAGES} URLs`)
  }

  if (errors.length > 0) return { isValid: false as const, errors }

  const data: PropertyInput = {
    title: body.title.trim(),
    description: isNonEmptyString(body.description) ? body.description.trim() : undefined,
    type: body.type,
    operation,
    price: body.price,
    currency,
    furnished,
    petsAllowed,
    expensesIncluded,
    wifiIncluded,
    commissionPercentage,
    address: body.address.trim(),
    city: body.city.trim(),
    region: body.region.trim(),
    bedrooms,
    bathrooms,
    areaSquareMeters,
    images,
    status: body.status,
    isExclusive,
    locationMode,
    locationRadiusMeters,
    latitude,
    longitude,
  }
  return { isValid: true as const, errors, data }
}
