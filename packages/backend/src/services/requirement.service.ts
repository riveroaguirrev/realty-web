import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requirementInput } from '@/utils/requirementInput'
import { scoreRequirement } from '@/utils/requirementMatching'
import { propertyCardSelect } from '@/utils/propertyView'
import type { RequirementSuggestionFilters } from '@shared/types/requirements'
const requirementSelect = {
  id: true, title: true, description: true, operation: true, propertyType: true,
  currency: true, priceMin: true, priceMax: true, cities: true, zones: true,
  bedroomsMin: true, bathroomsMin: true, areaMin: true,
  requiresGarage: true, requiresGroundFloor: true, petsRequired: true,
  buyerId: true, status: true, createdAt: true,
  buyer: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.RequirementSelect
export async function requirementSuggestions(id: string, filters: Partial<RequirementSuggestionFilters> = {}) {
  const requirement = await prisma.requirement.findUnique({ where: { id } })
  if (!requirement || requirement.status !== 'ACTIVE') return []
  const where: Prisma.PropertyWhereInput = {
    status: 'AVAILABLE', operation: requirement.operation, currency: requirement.currency,
    type: { in: requirement.propertyType },
    ...(filters.withinBudget ? { price: {
      gte: requirement.priceMin == null ? undefined : requirement.priceMin,
      lte: requirement.priceMax == null ? undefined : requirement.priceMax,
    } } : {}),
  }
  const select = { ...propertyCardSelect, region: true, description: true, features: true, hasGarage: true, parking: true, petPolicy: true, petsAllowed: true } satisfies Prisma.PropertySelect
  const rank = (property: Prisma.PropertyGetPayload<{ select: typeof select }>) => {
    const match = scoreRequirement(requirement, property)
    if (!match || (filters.minScore && (match.score == null || match.score < filters.minScore))) return []
    const { id, title, type, operation, price, currency, city, images, bedrooms, bathrooms, areaSquareMeters } = property
    return [{ ...match, property: { id, title, type, operation, price, currency, city, images, bedrooms, bathrooms, areaSquareMeters } }]
  }
  let ranked: ReturnType<typeof rank> = []
  let afterId: string | undefined
  // Scan in batches so an older, better match is not hidden by a newest-500 cutoff.
  // City comparison lives in scoreRequirement to normalize accents consistently.
  for (;;) {
    const candidates = await prisma.property.findMany({
      where: { ...where, id: { notIn: requirement.rejectedProperties, ...(afterId ? { gt: afterId } : {}) } },
      select, orderBy: { id: 'asc' }, take: 500,
    })
    ranked = [...ranked, ...candidates.flatMap(rank)]
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || a.propertyId.localeCompare(b.propertyId)).slice(0, 12)
    if (candidates.length < 500) break
    afterId = candidates[candidates.length - 1].id
  }
  return ranked
}
export async function publishRequirement(advisorId: string, input: unknown) {
  const data = requirementInput.parse(input)
  // The announcement and publication commit together. Push transport failure cannot undo a publication.
  return prisma.$transaction(async tx => {
    const requirement = await tx.requirement.create({ data: { ...data, buyerId: advisorId }, select: requirementSelect })
    const message = `${requirement.buyer.firstName} ${requirement.buyer.lastName}: ${requirement.title}`
    const actionUrl = `/requirements/${requirement.id}`
    await tx.$executeRaw`
      INSERT INTO "Notification" (
        "id", "advisorId", "type", "channel", "title", "message",
        "relatedEntityType", "relatedEntityId", "actionUrl", "actionLabel", "scheduledFor"
      )
      SELECT gen_random_uuid()::text, "id", 'REQUIREMENT_CREATED'::"NotificationType",
        'PUSH'::"NotificationChannelType", 'Nuevo requerimiento', ${message},
        'requirement', ${requirement.id}, ${actionUrl}, 'Ver requerimiento', CURRENT_TIMESTAMP
      FROM "Advisor"
      WHERE "status" = 'ACTIVE' AND "userRole" = 'ADVISOR' AND "id" <> ${advisorId}
    `
    return requirement
  })
}
export async function listRequirements(advisorId: string, mine: boolean, page: number) {
  const where = mine ? { buyerId: advisorId } : { status: 'ACTIVE' as const }
  const [items, total] = await Promise.all([
    prisma.requirement.findMany({ where, orderBy: { createdAt: 'desc' }, take: 20, skip: (page - 1) * 20, select: requirementSelect }),
    prisma.requirement.count({ where }),
  ])
  return { items, total }
}
export async function getRequirement(id: string, advisorId: string) {
  return prisma.requirement.findFirst({ where: { id, OR: [{ status: 'ACTIVE' }, { buyerId: advisorId }] }, select: requirementSelect })
}
