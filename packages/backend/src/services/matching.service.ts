import { propertyCardSelect } from '@/utils/propertyView'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

export interface MatchScore {
  propertyId: string
  score: number
  matchReason: string
}

type SimilarProperty = Prisma.PropertyGetPayload<{ select: typeof propertyCardSelect }>

const scoringSelect = {
  type: true, price: true, city: true, region: true, bedrooms: true,
  areaSquareMeters: true, features: true,
} satisfies Prisma.PropertySelect
const candidateLimit = 500

export interface PropertyMatch extends MatchScore {
  property: SimilarProperty
}

const normalizeFeatures = (features: Prisma.JsonValue | null): string[] => {
  if (!features) return []

  if (Array.isArray(features)) {
    return features.filter((feature): feature is string => typeof feature === 'string')
  }

  if (typeof features === 'object') {
    return Object.entries(features)
      .filter(([, value]) => value === true || value === 'true')
      .map(([feature]) => feature)
  }

  return []
}

export class MatchingService {
  static async getSimilarPropertiesWithDetails(
    propertyId: string,
    visibility: Prisma.PropertyWhereInput,
    limit = 6
  ): Promise<PropertyMatch[] | null> {
    const refProperty = await prisma.property.findFirst({
      where: { id: propertyId, ...visibility },
      select: scoringSelect,
    })
    if (!refProperty) return null

    const allProperties = await prisma.property.findMany({
      where: {
        id: { not: propertyId },
        AND: [visibility],
        status: 'AVAILABLE',
      },
      select: { ...scoringSelect, id: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: candidateLimit,
    })

    const scores = allProperties.map((prop) => {
      let score = 0
      let reason = ''

      // 1. Type match (30 points)
      if (prop.type === refProperty.type) {
        score += 30
        reason += 'Tipo coincide. '
      }

      // 2. Price match - within 50-150% (25 points)
      const refPrice = Number(refProperty.price)
      const propertyPrice = Number(prop.price)
      const priceRatio = refPrice > 0 ? propertyPrice / refPrice : 0
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
      const refFeatures = normalizeFeatures(refProperty.features)
      const propertyFeatures = new Set(normalizeFeatures(prop.features))
      if (refFeatures.length > 0 && propertyFeatures.size > 0) {
        const commonFeatures = refFeatures.filter((feature) => propertyFeatures.has(feature)).length
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

    const ranked = scores.sort((a, b) => b.score - a.score).slice(0, limit)
    const visibleProperties = await prisma.property.findMany({
      where: { id: { in: ranked.map(match => match.propertyId) }, status: 'AVAILABLE', AND: [visibility] },
      select: propertyCardSelect,
    })
    const byId = new Map(visibleProperties.map(property => [property.id, property]))
    return ranked.flatMap(match => {
      const property = byId.get(match.propertyId)
      return property ? [{ ...match, property }] : []
    })
  }
}
