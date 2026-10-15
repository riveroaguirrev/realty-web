import { emailSchema, passwordSchema, registerSchema, loginSchema } from '@shared/validation/auth'
import type { PropertyStatus, PropertyType } from '@prisma/client'

export const validateEmail = (value: unknown) => emailSchema.safeParse(value).success
export const validatePassword = (value: unknown) => passwordSchema.safeParse(value).success
const validate = (schema: typeof registerSchema | typeof loginSchema, payload: unknown) => {
  const result = schema.safeParse(payload)
  return { isValid: result.success, errors: result.success ? [] : result.error.issues.map((issue) => issue.message) }
}
export const validateSignUp = (payload: unknown) => validate(registerSchema, payload)
export const validateLogin = (payload: unknown) => validate(loginSchema, payload)

const PROPERTY_TYPES = ['RESIDENTIAL', 'COMMERCIAL', 'LAND', 'APARTMENT', 'HOUSE', 'OFFICE', 'INDUSTRIAL']
const PROPERTY_STATUSES = ['AVAILABLE', 'UNDER_OFFER', 'SOLD', 'RENT', 'ARCHIVED']
const MAX_PROPERTY_IMAGES = 20

export interface PropertyInput {
  title: string
  description?: string
  type: PropertyType
  price: number
  address: string
  city: string
  region: string
  bedrooms?: number
  bathrooms?: number
  areaSquareMeters?: number
  images: string[]
  status?: PropertyStatus
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
    price: body.price,
    address: body.address.trim(),
    city: body.city.trim(),
    region: body.region.trim(),
    bedrooms,
    bathrooms,
    areaSquareMeters,
    images,
    status: body.status,
  }
  return { isValid: true as const, errors, data }
}
