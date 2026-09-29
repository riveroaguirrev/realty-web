import { prisma } from '@/lib/prisma'
import { PropertyStatus } from '@shared/types'
import { generateUniqueSlug } from '@/utils/slug'
import { PropertyInput } from '@/utils/validators'

export class PropertyService {
  async createProperty(
    data: PropertyInput & { advisorId: string; organizationId?: string }
  ) {
    return await prisma.property.create({
      data: {
        ...data,
        slug: generateUniqueSlug(data.title),
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
    const page = filters?.page || 1
    const pageSize = filters?.pageSize || 10
    const skip = (page - 1) * pageSize

    const where: any = { status: 'AVAILABLE' }

    if (filters?.city) where.city = filters.city
    if (filters?.region) where.region = filters.region
    if (filters?.type) where.type = filters.type
    if (filters?.priceMin || filters?.priceMax) {
      where.price = {}
      if (filters.priceMin) where.price.gte = filters.priceMin
      if (filters.priceMax) where.price.lte = filters.priceMax
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
      properties,
      total,
      page,
      pageSize,
    }
  }

  async searchProperties(filters?: {
    city?: string
    region?: string
    type?: string
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
    const page = filters?.page || 1
    const pageSize = filters?.pageSize || 10
    const skip = (page - 1) * pageSize

    const where: any = { status: 'AVAILABLE' }

    if (filters?.city) where.city = filters.city
    if (filters?.region) where.region = filters.region
    if (filters?.type) where.type = filters.type
    if (filters?.organizationId) where.advisor = { organizationId: filters.organizationId }

    if (filters?.priceMin || filters?.priceMax) {
      where.price = {}
      if (filters.priceMin) where.price.gte = filters.priceMin
      if (filters.priceMax) where.price.lte = filters.priceMax
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
      properties,
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
        price: data.price,
        address: data.address,
        city: data.city,
        region: data.region,
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
