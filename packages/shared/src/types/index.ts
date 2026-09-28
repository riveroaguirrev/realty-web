// ============================================================================
// PROPERTY TYPES
// ============================================================================

export enum PropertyType {
  RESIDENTIAL = 'RESIDENTIAL',
  COMMERCIAL = 'COMMERCIAL',
  LAND = 'LAND',
  APARTMENT = 'APARTMENT',
  HOUSE = 'HOUSE',
  OFFICE = 'OFFICE',
  INDUSTRIAL = 'INDUSTRIAL',
}

export enum PropertyStatus {
  AVAILABLE = 'AVAILABLE',
  UNDER_OFFER = 'UNDER_OFFER',
  SOLD = 'SOLD',
  RENT = 'RENT',
  ARCHIVED = 'ARCHIVED',
}

export interface Property {
  id: string
  title: string
  description?: string
  type: PropertyType
  price: number
  currency: string
  address: string
  city: string
  region: string
  latitude?: number
  longitude?: number
  bedrooms?: number
  bathrooms?: number
  areaSquareMeters?: number
  images: string[]
  status: PropertyStatus
  advisorId: string
  organizationId?: string
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// ADVISOR TYPES
// ============================================================================

export interface Advisor {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  profileImage?: string
  bio?: string
  organizationId?: string
  specializations: string[]
  rating: number
  isVerified: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// ORGANIZATION TYPES
// ============================================================================

export interface Organization {
  id: string
  name: string
  slug: string
  city: string
  region: string
  phone?: string
  email?: string
  website?: string
  logo?: string
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// REQUIREMENT TYPES
// ============================================================================

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export interface Requirement {
  id: string
  title: string
  description?: string
  buyerId: string
  propertyType: PropertyType[]
  priceMin?: number
  priceMax?: number
  cities: string[]
  regions: string[]
  bedroomsMin?: number
  bedroomsMax?: number
  bathroomsMin?: number
  bathroomsMax?: number
  priority: Priority
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// MATCH TYPES
// ============================================================================

export enum MatchStatus {
  SUGGESTED = 'SUGGESTED',
  VIEWED = 'VIEWED',
  CONTACTED = 'CONTACTED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

export interface Match {
  id: string
  requirementId: string
  propertyId: string
  advisorId: string
  matchScore: number
  reason?: string
  status: MatchStatus
  createdAt: Date
  updatedAt: Date
  viewedAt?: Date
  contactedAt?: Date
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    message: string
    code?: string
  }
  meta?: {
    page?: number
    pageSize?: number
    total?: number
  }
}

export interface PaginationParams {
  page?: number
  pageSize?: number
  sort?: string
  order?: 'asc' | 'desc'
}
