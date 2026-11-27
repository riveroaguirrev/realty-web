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
  type: true, operation: true, currency: true, price: true, city: true, region: true, bedrooms: true,
  areaSquareMeters: true, features: true,
} satisfies Prisma.PropertySelect
const candidateLimit = 500

export interface PropertyMatch extends MatchScore {
  property: SimilarProperty
}

const normalizeFeatures = (features: Prisma.JsonValue | null): string[] => {
  if (!features) return []

  if (Array.isArray(features)) {
    return [...new Set(features.filter((feature): feature is string => typeof feature === 'string'))]
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
        operation: refProperty.operation,
        currency: refProperty.currency,
      },
      select: { ...scoringSelect, id: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: candidateLimit,
    })

    const refPrice = Number(refProperty.price)
    const refFeatures = normalizeFeatures(refProperty.features)
    const normalizeLocation = (value: string | null) => value?.trim().toLocaleLowerCase('es') ?? ''
    const refCity = normalizeLocation(refProperty.city)
    const refRegion = normalizeLocation(refProperty.region)
    // Only criteria recorded on the reference property contribute to the denominator.
    const possibleScore = 30
      + (refPrice > 0 ? 25 : 0)
      + (refCity || refRegion ? 20 : 0)
      + (refProperty.bedrooms !== null ? 10 : 0)
      + (refProperty.areaSquareMeters !== null && refProperty.areaSquareMeters > 0 ? 10 : 0)
      + (refFeatures.length > 0 ? 5 : 0)

    const scores = allProperties.map((prop) => {
      let points = 0
      const reasons: string[] = []
      if (prop.type === refProperty.type) {
        points += 30
        reasons.push('Tipo coincide.')
      }

      const priceRatio = refPrice > 0 ? Number(prop.price) / refPrice : 0
      if (priceRatio >= 0.5 && priceRatio <= 1.5) {
        points += 25
        reasons.push('Precio compatible.')
      }

      const sameCity = !!refCity && normalizeLocation(prop.city) === refCity
      const sameRegion = !!refRegion && normalizeLocation(prop.region) === refRegion
      if ((sameCity && (!refRegion || sameRegion)) || (!refCity && sameRegion)) {
        points += 20
        reasons.push(sameCity ? 'Misma ciudad y región registrada.' : 'Misma región.')
      } else if (sameCity || sameRegion) {
        points += 10
        reasons.push(sameCity ? 'Misma ciudad.' : 'Misma región.')
      }

      if (refProperty.bedrooms !== null && prop.bedrooms !== null
        && Math.abs(prop.bedrooms - refProperty.bedrooms) <= 1) {
        points += 10
        reasons.push('Dormitorios similares.')
      }

      if (refProperty.areaSquareMeters !== null && refProperty.areaSquareMeters > 0
        && prop.areaSquareMeters !== null && prop.areaSquareMeters > 0
        && Math.abs(prop.areaSquareMeters - refProperty.areaSquareMeters) <= 50) {
        points += 10
        reasons.push('Área similar.')
      }

      const propertyFeatures = new Set(normalizeFeatures(prop.features))
      const commonFeatures = refFeatures.filter(feature => propertyFeatures.has(feature)).length
      if (commonFeatures > 0) {
        // Features share a fixed five-point weight, regardless of their count.
        points += 5 * commonFeatures / refFeatures.length
        reasons.push(`${commonFeatures} característica(s) en común.`)
      }

      return {
        propertyId: prop.id,
        score: Math.max(0, Math.min(100, Math.round(points / possibleScore * 100))),
        matchReason: reasons.join(' '),
      }
    })

    const ranked = scores.sort((a, b) => b.score - a.score).slice(0, limit)
    const visibleProperties = await prisma.property.findMany({
      where: {
        id: { in: ranked.map(match => match.propertyId) },
        status: 'AVAILABLE',
        operation: refProperty.operation,
        currency: refProperty.currency,
        AND: [visibility],
      },
      select: propertyCardSelect,
    })
    const byId = new Map(visibleProperties.map(property => [property.id, property]))
    return ranked.flatMap(match => {
      const property = byId.get(match.propertyId)
      return property ? [{ ...match, property }] : []
    })
  }
}
