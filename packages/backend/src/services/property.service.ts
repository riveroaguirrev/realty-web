import { publicPropertyLocation } from '@/utils/propertyLocation'
import { prisma } from '@/lib/prisma'
import { PropertyStatus } from '@shared/types'
import { slugify } from '@/utils/slug'
import { PropertyInput } from '@/utils/validators'
import { Prisma } from '@prisma/client'

const UNIQUE_CONSTRAINT_ERROR = 'P2002'

const normalizeTextFilter = (value?: string): string | undefined => {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}

const normalizePagination = (page?: number, pageSize?: number) => {
  const normalizedPage = Number.isFinite(page) && page && page > 0 ? Math.floor(page) : 1
  const normalizedPageSize = Number.isFinite(pageSize) && pageSize && pageSize > 0
    ? Math.min(Math.floor(pageSize), 100)
    : 10

  return { page: normalizedPage, pageSize: normalizedPageSize }
}

const isSlugUniqueConstraintError = (error: unknown): error is Prisma.PrismaClientKnownRequestError => {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false
  if (error.code !== UNIQUE_CONSTRAINT_ERROR) return false

  const target = error.meta?.target
  return Array.isArray(target) ? target.includes('slug') : target === 'slug'
}

export class PropertyService {
  private async generateAvailableSlug(title: string) {
    const base = slugify(title) || 'property'
    const existingProperties = await prisma.property.findMany({
      where: {
        OR: [
          { slug: base },
          { slug: { startsWith: `${base}-` } },
        ],
      },
      select: { slug: true },
    })

    const existingSlugs = new Set(existingProperties.map((property) => property.slug))
    if (!existingSlugs.has(base)) return base

    let suffix = 2
    while (existingSlugs.has(`${base}-${suffix}`)) {
      suffix += 1
    }
    return `${base}-${suffix}`
  }

  async createProperty(
    data: PropertyInput & { advisorId: string; organizationId?: string }
  ) {
    const slug = await this.generateAvailableSlug(data.title)

    const createWithSlug = (propertySlug: string) => prisma.property.create({
      data: {
        ...data,
        slug: propertySlug,
        status: 'AVAILABLE',
      },
      include: {
        advisor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    try {
      return await createWithSlug(slug)
    } catch (error) {
      if (!isSlugUniqueConstraintError(error)) throw error
      return await createWithSlug(`${slug}-${Date.now().toString(36)}`)
    }
  }

  async getProperty(id: string) {
    return await prisma.property.findUnique({
      where: { id },
      include: {
        advisor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            profileImage: true,
            organization: { select: { id: true, name: true } },
          },
        },
      },
    })
  }

  async listProperties(
    filters?: {
      city?: string
      region?: string
      type?: string
      priceMin?: number
      priceMax?: number
      page?: number
      pageSize?: number
    }
  ) {
    const { page, pageSize } = normalizePagination(filters?.page, filters?.pageSize)
    const skip = (page - 1) * pageSize
    const city = normalizeTextFilter(filters?.city)
    const region = normalizeTextFilter(filters?.region)
    const type = normalizeTextFilter(filters?.type)

    const where: any = { status: 'AVAILABLE' }

    if (city) where.city = { contains: city, mode: 'insensitive' }
    if (region) where.region = { contains: region, mode: 'insensitive' }
    if (type) where.type = type
    if (filters?.priceMin !== undefined || filters?.priceMax !== undefined) {
      where.price = {}
      if (filters.priceMin !== undefined) where.price.gte = filters.priceMin
      if (filters.priceMax !== undefined) where.price.lte = filters.priceMax
    }

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          advisor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.property.count({ where }),
    ])

    return {
      properties: properties.map(publicPropertyLocation),
      total,
      page,
      pageSize,
    }
  }

  async searchProperties(filters?: {
    west?: number
    south?: number
    east?: number
    north?: number
    city?: string
    region?: string
    type?: string
    operation?: string
    currency?: string
    mapView?: boolean
    priceMin?: number
    priceMax?: number
    bedroomsMin?: number
    bedroomsMax?: number
    bathroomsMin?: number
    bathroomsMax?: number
    areaMin?: number
    areaMax?: number
    organizationId?: string
    page?: number
    pageSize?: number
  }) {
    const { page, pageSize } = normalizePagination(filters?.page, filters?.pageSize)
    const skip = (page - 1) * pageSize
    const city = normalizeTextFilter(filters?.city)
    const region = normalizeTextFilter(filters?.region)
    const type = normalizeTextFilter(filters?.type)
    const organizationId = normalizeTextFilter(filters?.organizationId)

    const where: any = { status: 'AVAILABLE' }

    if (city) where.city = { contains: city, mode: 'insensitive' }
    if (region) where.region = { contains: region, mode: 'insensitive' }
    if (type) where.type = type
    if (filters?.operation) where.operation = filters.operation
    if (filters?.currency) where.currency = filters.currency
    if (organizationId) where.advisor = { organizationId }

    if (filters?.west !== undefined && filters.east !== undefined && filters.south !== undefined && filters.north !== undefined) {
      where.longitude = { gte: filters.west, lte: filters.east }
      where.latitude = { gte: filters.south, lte: filters.north }
    }

    if (filters?.priceMin !== undefined || filters?.priceMax !== undefined) {
      where.price = {}
      if (filters.priceMin !== undefined) where.price.gte = filters.priceMin
      if (filters.priceMax !== undefined) where.price.lte = filters.priceMax
    }

    if (filters?.bedroomsMin !== undefined || filters?.bedroomsMax !== undefined) {
      where.bedrooms = {}
      if (filters.bedroomsMin !== undefined) where.bedrooms.gte = filters.bedroomsMin
      if (filters.bedroomsMax !== undefined) where.bedrooms.lte = filters.bedroomsMax
    }

    if (filters?.bathroomsMin !== undefined || filters?.bathroomsMax !== undefined) {
      where.bathrooms = {}
      if (filters.bathroomsMin !== undefined) where.bathrooms.gte = filters.bathroomsMin
      if (filters.bathroomsMax !== undefined) where.bathrooms.lte = filters.bathroomsMax
    }

    if (filters?.areaMin !== undefined || filters?.areaMax !== undefined) {
      where.areaSquareMeters = {}
      if (filters.areaMin !== undefined) where.areaSquareMeters.gte = filters.areaMin
      if (filters.areaMax !== undefined) where.areaSquareMeters.lte = filters.areaMax
    }

    if (filters?.mapView) {
      // A map must cover the search, independently of the list's pagination.
      const locatedWhere = { ...where, latitude: { not: null, gte: -85, lte: 85, ...where.latitude }, longitude: { not: null, gte: -180, lte: 180, ...where.longitude } }
      const limit = 2000
      const [properties, total, locatedTotal] = await Promise.all([
        prisma.property.findMany({
          where: locatedWhere, take: limit, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
          select: { id: true, title: true, price: true, currency: true, type: true, operation: true,
            city: true, region: true, bedrooms: true, bathrooms: true, areaSquareMeters: true,
            images: true, latitude: true, longitude: true, isExclusive: true, locationMode: true,
            locationRadiusMeters: true, address: true },
        }),
        prisma.property.count({ where }),
        prisma.property.count({ where: locatedWhere }),
      ])
      return { properties: properties.map(publicPropertyLocation), total, locatedTotal, limit, page: 1, pageSize: limit }
    }

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          advisor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              organization: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.property.count({ where }),
    ])

    return {
      properties: properties.map(publicPropertyLocation),
      total,
      page,
      pageSize,
    }
  }

  async getAdvisorProperties(advisorId: string, page = 1, pageSize = 10) {
    const skip = (page - 1) * pageSize

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where: { advisorId },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.property.count({ where: { advisorId } }),
    ])

    return {
      properties,
      total,
      page,
      pageSize,
    }
  }

  async updateProperty(id: string, data: PropertyInput) {
    return await prisma.property.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description ?? null,
        type: data.type,
        operation: data.operation,
        price: data.price,
        currency: data.currency,
        furnished: data.furnished,
        petsAllowed: data.petsAllowed,
        expensesIncluded: data.expensesIncluded,
        wifiIncluded: data.wifiIncluded,
        commissionPercentage: data.commissionPercentage,
        address: data.address,
        city: data.city,
        region: data.region,
        isExclusive: data.isExclusive,
        locationMode: data.locationMode,
        locationRadiusMeters: data.locationRadiusMeters,
        latitude: data.latitude,
        longitude: data.longitude,
        bedrooms: data.bedrooms ?? null,
        bathrooms: data.bathrooms ?? null,
        areaSquareMeters: data.areaSquareMeters ?? null,
        images: data.images,
        ...(data.status && { status: data.status }),
      },
      include: {
        advisor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })
  }

  async deleteProperty(id: string) {
    return await prisma.property.delete({
      where: { id },
    })
  }

  async updatePropertyStatus(id: string, status: PropertyStatus) {
    return await prisma.property.update({
      where: { id },
      data: { status },
    })
  }
}

export const propertyService = new PropertyService()
