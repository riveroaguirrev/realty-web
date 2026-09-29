import { prisma } from '@/lib/prisma'

export class FavoritesService {
  async addFavorite(advisorId: string, propertyId: string) {
    return await prisma.favorite.create({
      data: {
        buyerId: advisorId,
        propertyId,
      },
      include: {
        property: {
          include: {
            advisor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                organization: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    })
  }

  async removeFavorite(advisorId: string, propertyId: string) {
    return await prisma.favorite.delete({
      where: {
        buyerId_propertyId: {
          buyerId: advisorId,
          propertyId,
        },
      },
    })
  }

  async getFavorite(advisorId: string, propertyId: string) {
    return await prisma.favorite.findUnique({
      where: {
        buyerId_propertyId: {
          buyerId: advisorId,
          propertyId,
        },
      },
    })
  }

  async listFavorites(advisorId: string, page = 1, pageSize = 10) {
    const skip = (page - 1) * pageSize

    const [favorites, total] = await Promise.all([
      prisma.favorite.findMany({
        where: { buyerId: advisorId },
        skip,
        take: pageSize,
        include: {
          property: {
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
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.favorite.count({ where: { buyerId: advisorId } }),
    ])

    return {
      favorites,
      total,
      page,
      pageSize,
    }
  }

  async isFavorite(advisorId: string, propertyId: string): Promise<boolean> {
    const favorite = await prisma.favorite.findUnique({
      where: {
        buyerId_propertyId: {
          buyerId: advisorId,
          propertyId,
        },
      },
    })
    return !!favorite
  }
}

export const favoritesService = new FavoritesService()
