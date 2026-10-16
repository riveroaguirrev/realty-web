export type RequirementOperation = 'SALE' | 'RENTAL' | 'ANTICRETIC'
export type RequirementStatus = 'ACTIVE' | 'PAUSED' | 'FULFILLED' | 'EXPIRED'
export interface RequirementInput {
  title: string
  description?: string
  operation: RequirementOperation
  propertyType: string[]
  currency: 'BOB' | 'USD'
  priceMin?: number | null
  priceMax?: number | null
  cities: string[]
  zones: string[]
  bedroomsMin?: number | null
  bathroomsMin?: number | null
  areaMin?: number | null
  requiresGarage: boolean
  requiresGroundFloor: boolean
  petsRequired: boolean
}
export interface RequirementRecord extends Omit<RequirementInput, 'priceMin' | 'priceMax'> {
  id: string
  buyerId: string
  priceMin: string | number | null
  priceMax: string | number | null
  status: RequirementStatus
  createdAt: string
  buyer: { id: string; firstName: string; lastName: string }
}
export interface RequirementSuggestion {
  propertyId: string
  score: number
  reasons: string[]
  mismatches: string[]
  property: {
    id: string; title: string; type: string; operation: RequirementOperation
    price: string | number; currency: string; city: string; images: string[]
    bedrooms?: number; bathrooms?: number; areaSquareMeters?: number
  }
}
export interface RequirementDetail extends RequirementRecord {
  suggestions: RequirementSuggestion[]
}
