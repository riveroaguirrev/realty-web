import { propertyAudienceWhere } from '@/lib/permissions'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requirementInput } from '@/utils/requirementInput'
import { scoreRequirement } from '@/utils/requirementMatching'
import { propertyCardSelect } from '@/utils/propertyView'
import { RouteError } from '@/utils/authenticatedRoute'
import type { RequirementSuggestionFilters } from '@shared/types/requirements'
import { whatsappPhoneFor } from '@/utils/whatsappContact'
const requirementSelect = {
  id: true, title: true, description: true, operation: true, propertyType: true,
  currency: true, priceMin: true, priceMax: true, cities: true, zones: true,
  bedroomsMin: true, bathroomsMin: true, areaMin: true,
  requiresGarage: true, requiresGroundFloor: true, petsRequired: true,
  buyerId: true, status: true, createdAt: true, visibility: true, organizationId: true,
  buyer: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.RequirementSelect
export async function requirementSuggestions(id: string, filters: Partial<RequirementSuggestionFilters> = {}, viewerId?: string) {
  const requirement = await prisma.requirement.findUnique({ where: { id } })
  if (!requirement || requirement.status !== 'ACTIVE') return []
  const viewer = viewerId ? await prisma.advisor.findUnique({ where: { id: viewerId }, select: { id: true, organizationId: true } }) : null
  const where: Prisma.PropertyWhereInput = {
    ...propertyAudienceWhere(viewer ? { id: viewer.id, organizationId: viewer.organizationId ?? undefined } : null),
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
    const scope = await requirementScope(tx, advisorId, data.visibility || 'PUBLIC')
    const requirement = await tx.requirement.create({ data: { ...data, ...scope, buyerId: advisorId }, select: requirementSelect })
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
        AND (${requirement.visibility} = 'PUBLIC' OR "organizationId" = ${requirement.organizationId})
    `
    return requirement
  })
}
export async function listRequirements(advisorId: string, mine: boolean, page: number, organizationOnly = false) {
  const where: Prisma.RequirementWhereInput = mine ? { buyerId: advisorId } : { status: 'ACTIVE', ...await requirementAccess(prisma, advisorId) }
  if (organizationOnly) {
    const advisor = await prisma.advisor.findUnique({ where: { id: advisorId }, select: { organizationId: true } })
    if (!advisor?.organizationId) throw new RouteError(403, 'Tu cuenta no pertenece a una organización.')
    where.AND = [{ OR: [
      { visibility: 'PUBLIC', buyer: { organizationId: advisor.organizationId } },
      { visibility: 'ORGANIZATION', organizationId: advisor.organizationId },
    ] }]
  }
  const [items, total] = await Promise.all([
    prisma.requirement.findMany({ where, orderBy: { createdAt: 'desc' }, take: 20, skip: (page - 1) * 20, select: requirementSelect }),
    prisma.requirement.count({ where }),
  ])
  return { items, total }
}
async function requirementDetailWhere(id: string, advisorId: string): Promise<Prisma.RequirementWhereInput> {
  return { id, AND: [await requirementAccess(prisma, advisorId), { OR: [{ status: 'ACTIVE' }, { buyerId: advisorId }] }] }
}

export async function getRequirement(id: string, advisorId: string) {
  return prisma.requirement.findFirst({ where: await requirementDetailWhere(id, advisorId), select: requirementSelect })
}

export async function getRequirementDetail(id: string, advisorId: string) {
  const requirement = await prisma.requirement.findFirst({
    where: await requirementDetailWhere(id, advisorId),
    select: { ...requirementSelect, buyer: { select: { ...requirementSelect.buyer.select, phone: true, status: true, userRole: true } } },
  })
  if (!requirement) return null
  const { id: buyerId, firstName, lastName } = requirement.buyer
  return { ...requirement, buyer: { id: buyerId, firstName, lastName, whatsappPhone: whatsappPhoneFor(requirement.buyer, advisorId) } }
}

// Organization membership comes from the database, never from a client-supplied id.
export async function requirementScope(db: Prisma.TransactionClient, advisorId: string, visibility: string) {
  if (visibility === 'PUBLIC') return { visibility, organizationId: null }
  const advisor = await db.advisor.findUnique({ where: { id: advisorId }, select: { organizationId: true } })
  if (!advisor?.organizationId) throw new RouteError(400, 'Debes pertenecer a una organización para publicar solo en ella.')
  return { visibility, organizationId: advisor.organizationId }
}
export async function requirementAccess(db: Prisma.TransactionClient, advisorId: string): Promise<Prisma.RequirementWhereInput> {
  const advisor = await db.advisor.findUnique({ where: { id: advisorId }, select: { organizationId: true } })
  return { OR: [{ buyerId: advisorId }, { visibility: 'PUBLIC' }, ...(advisor?.organizationId ? [{ visibility: 'ORGANIZATION', organizationId: advisor.organizationId }] : [])] }
}
export async function updateRequirement(id: string, advisorId: string, data: Prisma.RequirementUpdateManyMutationInput & { visibility?: string }) {
  return prisma.$transaction(async tx => {
    const current = await tx.requirement.findFirst({ where: { id, buyerId: advisorId }, select: { visibility: true, organizationId: true } })
    if (!current) throw new RouteError(404, 'No puedes modificar este requerimiento.')
    const scope = data.visibility ? await requirementScope(tx, advisorId, data.visibility) : {}
    await tx.requirement.update({ where: { id }, data: { ...data, ...scope } })
    // Remove queued and in-app notices that no longer belong to the chosen audience.
    const visibility = data.visibility || current.visibility
    const organizationId = 'organizationId' in scope ? scope.organizationId : current.organizationId
    if (visibility === 'ORGANIZATION') await tx.notification.deleteMany({ where: {
      type: 'REQUIREMENT_CREATED', relatedEntityId: id,
      advisor: { OR: [{ organizationId: null }, ...(organizationId ? [{ organizationId: { not: organizationId } }] : [{}])] },
    } })
  })
}
