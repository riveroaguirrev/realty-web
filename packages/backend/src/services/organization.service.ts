import { prisma } from '@/lib/prisma'
import { Errors } from '@/utils/errors'

export class OrganizationService {
  async createOrganization(
    advisorId: string,
    data: {
      name: string
      slug?: string
      city?: string
      region?: string
      phone?: string
      email?: string
      website?: string
      logo?: string
    }
  ) {
    const slug = data.slug || data.name.toLowerCase().replace(/\s+/g, '-')

    // Check if slug already exists
    const existing = await prisma.organization.findUnique({
      where: { slug },
    })

    if (existing) {
      throw new Error('Organization slug already exists')
    }

    const organization = await prisma.organization.create({
      data: {
        name: data.name,
        slug,
        city: data.city || '',
        region: data.region || '',
        phone: data.phone,
        email: data.email,
        website: data.website,
        logo: data.logo,
      },
    })

    // Add creator as DIRECTOR
    await prisma.advisor.update({
      where: { id: advisorId },
      data: {
        organizationId: organization.id,
        role: 'DIRECTOR',
      },
    })

    return organization
  }

  async getOrganization(orgId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        advisors: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            profileImage: true,
          },
        },
      },
    })

    if (!org) {
      throw Errors.USER_NOT_FOUND
    }

    return org
  }

  async updateOrganization(
    orgId: string,
    data: {
      name?: string
      city?: string
      region?: string
      phone?: string
      email?: string
      website?: string
      logo?: string
    }
  ) {
    const organization = await prisma.organization.update({
      where: { id: orgId },
      data: {
        name: data.name,
        city: data.city,
        region: data.region,
        phone: data.phone,
        email: data.email,
        website: data.website,
        logo: data.logo,
      },
    })

    return organization
  }

  async listOrganizationAdvisors(orgId: string) {
    const advisors = await prisma.advisor.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        profileImage: true,
        phone: true,
        bio: true,
        rating: true,
        totalPropertiesListed: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    return advisors
  }

  async getOrganizationProperties(orgId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where: { organizationId: orgId },
        include: {
          advisor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImage: true,
            },
          },
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.property.count({
        where: { organizationId: orgId },
      }),
    ])

    return {
      properties,
      pagination: {
        page,
        pageSize,
        total,
        pages: Math.ceil(total / pageSize),
      },
    }
  }
}

export const organizationService = new OrganizationService()
