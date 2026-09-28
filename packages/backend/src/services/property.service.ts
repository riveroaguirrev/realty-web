import { prisma } from '@/lib/prisma'
import { Property, PropertyStatus } from '@shared/types'

export class PropertyService {
  async createProperty(
    data: {
      title: string
      description?: string
      type: string
      price: number
      address: string
      city: string
      region: string
      bedrooms?: number
      bathrooms?: number
      areaSquareMeters?: number
      images?: string[]
      advisorId: string
      organizationId?: string
    }
  ) {
    return await prisma.property.create({
      data: {
        ...data,
        slug: data.title.toLowerCase().replace(/\s+/g, '-'),
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

  async updateProperty(id: string, data: Partial<any>) {
    return await prisma.property.update({
      where: { id },
      data,
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
