import { propertyCardSelect } from '@/utils/propertyView'
import { visiblePropertyWhere } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { serializable } from '@/lib/transactions'
import { ApiError } from '@/utils/errors'

type PropertyViewer = Parameters<typeof visiblePropertyWhere>[0]

export class FavoritesService {
  async addFavorite(user: PropertyViewer, propertyId: string) {
    return serializable(async (tx) => {
      const property = await tx.property.findFirst({
        where: { id: propertyId, status: 'AVAILABLE', AND: [visiblePropertyWhere(user)] },
        select: { id: true },
      })
      if (!property) throw new ApiError(404, 'PROPERTY_NOT_FOUND', 'Property not found')

      return tx.favorite.create({
        data: { buyerId: user.id, propertyId },
        include: { property: { select: propertyCardSelect } },
      })
    })
  }

  async removeFavorite(advisorId: string, propertyId: string) {
    return prisma.favorite.delete({ where: { buyerId_propertyId: { buyerId: advisorId, propertyId } } })
  }

  async listFavorites(user: PropertyViewer, page = 1, pageSize = 10) {
    const where = { buyerId: user.id, property: { status: 'AVAILABLE' as const, AND: [visiblePropertyWhere(user)] } }
    const [favorites, total] = await Promise.all([
      prisma.favorite.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { property: { select: propertyCardSelect } },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
      prisma.favorite.count({ where }),
    ])
    return { favorites, total, page, pageSize }
  }

  async isFavorite(advisorId: string, propertyId: string): Promise<boolean> {
    return !!await prisma.favorite.findUnique({
      where: { buyerId_propertyId: { buyerId: advisorId, propertyId } },
      select: { id: true },
    })
  }
}

export const favoritesService = new FavoritesService()
