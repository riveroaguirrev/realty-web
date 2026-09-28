import { prisma } from '@/lib/prisma'

export interface MatchScore {
  propertyId: string
  score: number
  matchReason: string
}

export class MatchingService {
  static async findSimilarProperties(
    propertyId: string,
    limit = 6
  ): Promise<MatchScore[]> {
    // Get the reference property
    const refProperty = await prisma.property.findUnique({
      where: { id: propertyId },
    })

    if (!refProperty) {
      return []
    }

    // Get all other properties
    const allProperties = await prisma.property.findMany({
      where: {
        id: { not: propertyId },
        status: 'AVAILABLE',
      },
      include: {
        advisor: {
          include: {
            organization: true,
          },
        },
      },
    })

    // Calculate match scores
    const scores = allProperties.map((prop) => {
      let score = 0
      let reason = ''

      // 1. Type match (30 points)
      if (prop.type === refProperty.type) {
        score += 30
        reason += 'Tipo coincide. '
      }

      // 2. Price match - within 50-150% (25 points)
      const priceRatio = prop.price / refProperty.price
      if (priceRatio >= 0.5 && priceRatio <= 1.5) {
        score += 25
        reason += 'Precio compatible. '
      }

      // 3. Location match (20 points)
      if (prop.city === refProperty.city && prop.region === refProperty.region) {
        score += 20
        reason += 'Ubicación exacta. '
      } else if (prop.region === refProperty.region) {
        score += 10
        reason += 'Mismo región. '
      }

      // 4. Bedroom match (10 points)
      if (
        refProperty.bedrooms &&
        prop.bedrooms &&
        Math.abs(prop.bedrooms - refProperty.bedrooms) <= 1
      ) {
        score += 10
        reason += 'Dormitorios similares. '
      }

      // 5. Area match (10 points)
      if (
        refProperty.areaSquareMeters &&
        prop.areaSquareMeters &&
        Math.abs(prop.areaSquareMeters - refProperty.areaSquareMeters) <= 50
      ) {
        score += 10
        reason += 'Área similar. '
      }

      // 6. Features bonus
      if (refProperty.features && prop.features) {
        const commonFeatures = refProperty.features.filter((f) =>
          prop.features?.includes(f)
        ).length
        score += commonFeatures * 5
        if (commonFeatures > 0) {
          reason += `${commonFeatures} característica(s) en común. `
        }
      }

      return {
        propertyId: prop.id,
        score,
        matchReason: reason.trim(),
      }
    })

    // Sort by score descending and limit
    return scores.sort((a, b) => b.score - a.score).slice(0, limit)
  }

  static async getSimilarPropertiesWithDetails(
    propertyId: string,
    limit = 6
  ): Promise<
    (MatchScore & {
      property: any
    })[]
  > {
    const matchScores = await this.findSimilarProperties(propertyId, limit)

    // Get full property details
    const properties = await Promise.all(
      matchScores.map(async (match) => {
        const property = await prisma.property.findUnique({
          where: { id: match.propertyId },
          include: {
            advisor: {
              include: {
                organization: true,
              },
            },
          },
        })

        return {
          ...match,
          property,
        }
      })
    )

    return properties.filter((p) => p.property !== null)
  }
}
