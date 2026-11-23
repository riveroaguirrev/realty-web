import type { Prisma } from '@prisma/client'

export const propertyCardSelect = {
  id: true, title: true, type: true, operation: true, price: true, currency: true,
  city: true, bedrooms: true, bathrooms: true, areaSquareMeters: true, images: true,
} satisfies Prisma.PropertySelect

export const propertyDiscoverySelect = {
  ...propertyCardSelect,
  region: true, description: true, slug: true, status: true, createdAt: true, publishedAt: true,
  address: true, latitude: true, longitude: true, isExclusive: true,
  locationMode: true, locationRadiusMeters: true, zipCode: true, mapUrl: true,
  furnished: true, petsAllowed: true, expensesIncluded: true, wifiIncluded: true,
  commissionPercentage: true, hasGarage: true, hasPool: true, hasGarden: true,
  advisorId: true, organizationId: true,
} satisfies Prisma.PropertySelect

type DiscoveryFields = Prisma.PropertyGetPayload<{ select: typeof propertyDiscoverySelect }>

export function propertyDiscoveryView<T extends DiscoveryFields & { advisor: unknown }>(property: T) {
  const selected = Object.fromEntries(
    Object.keys(propertyDiscoverySelect).map(key => [key, property[key as keyof DiscoveryFields]])
  ) as DiscoveryFields
  return { ...selected, advisor: property.advisor }
}
