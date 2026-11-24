export interface OrganizationAdvisorProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  profileImage: string | null
  bio: string | null
  role: string
  status: string
  licenseNumber: string | null
  yearsExperience: number | null
  specializations: string[]
  language: string[]
  rating: number | null
  reviewCount: number | null
  isVerified: boolean
  createdAt: string
}
export interface OrganizationAdvisorProperty {
  id: string
  title: string
  type: string
  operation: 'SALE' | 'RENTAL' | 'ANTICRETIC'
  status: string
  price: string | number
  currency: string
  city: string
  bedrooms: number | null
  bathrooms: number | null
  areaSquareMeters: number | null
  images: string[]
}
export interface OrganizationAdvisorDetail {
  advisor: OrganizationAdvisorProfile
  properties: OrganizationAdvisorProperty[]
  summary: { total: number; available: number; closed: number; archived: number }
  pagination: { page: number; pageSize: number; total: number; pages: number }
}
