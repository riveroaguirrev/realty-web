import { prisma } from '@/lib/prisma'

export class FavoritesService {
  async addFavorite(userId: string, propertyId: string) {
    return await prisma.favorite.create({
      data: {
        userId,
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

  async removeFavorite(userId: string, propertyId: string) {
    return await prisma.favorite.delete({
      where: {
        userId_propertyId: {
          userId,
          propertyId,
        },
      },
    })
  }

  async getFavorite(userId: string, propertyId: string) {
    return await prisma.favorite.findUnique({
      where: {
        userId_propertyId: {
          userId,
          propertyId,
        },
      },
    })
  }

  async listFavorites(userId: string, page = 1, pageSize = 10) {
    const skip = (page - 1) * pageSize

    const [favorites, total] = await Promise.all([
      prisma.favorite.findMany({
        where: { userId },
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
      prisma.favorite.count({ where: { userId } }),
    ])

    return {
      favorites,
      total,
      page,
      pageSize,
    }
  }

  async isFavorite(userId: string, propertyId: string): Promise<boolean> {
    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_propertyId: {
          userId,
          propertyId,
        },
      },
    })
    return !!favorite
  }
}

export const favoritesService = new FavoritesService()
