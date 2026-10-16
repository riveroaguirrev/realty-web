import { prisma } from '@/lib/prisma'
import { requirementInput } from '@/utils/requirementInput'
import { scoreRequirement } from '@/utils/requirementMatching'
import { publicPropertyLocation } from '@/utils/propertyLocation'
const buyerSelect = { id: true, firstName: true, lastName: true }
export async function requirementSuggestions(id: string) {
  const requirement = await prisma.requirement.findUnique({ where: { id } })
  if (!requirement || requirement.status !== 'ACTIVE') return []
  const candidates = await prisma.property.findMany({
    where: {
      status: 'AVAILABLE', operation: requirement.operation, currency: requirement.currency,
      type: { in: requirement.propertyType },
      OR: requirement.cities.map(city => ({ city: { equals: city, mode: 'insensitive' as const } })),
      id: { notIn: requirement.rejectedProperties },
    },
  })
  return candidates.flatMap(property => {
    const match = scoreRequirement(requirement, property)
    return match && match.score >= 50 ? [{ ...match, property: publicPropertyLocation(property) }] : []
  }).sort((a, b) => b.score - a.score || a.propertyId.localeCompare(b.propertyId)).slice(0, 12)
}
export async function publishRequirement(advisorId: string, input: unknown) {
  const data = requirementInput.parse(input)
  // The announcement and publication commit together. Push transport failure cannot undo a publication.
  return prisma.$transaction(async tx => {
    const requirement = await tx.requirement.create({ data: { ...data, buyerId: advisorId }, include: { buyer: { select: buyerSelect } } })
    const recipients = await tx.advisor.findMany({ where: { status: 'ACTIVE', userRole: 'ADVISOR', id: { not: advisorId } }, select: { id: true } })
    if (recipients.length) await tx.notification.createMany({ data: recipients.map(({ id }) => ({
      advisorId: id, type: 'REQUIREMENT_CREATED' as const, channel: 'PUSH' as const,
      title: 'Nuevo requerimiento', message: `${requirement.buyer.firstName} ${requirement.buyer.lastName}: ${requirement.title}`,
      relatedEntityType: 'requirement', relatedEntityId: requirement.id,
      actionUrl: `/requirements/${requirement.id}`, actionLabel: 'Ver requerimiento', scheduledFor: new Date(),
    })) })
    return requirement
  })
}
export async function listRequirements(advisorId: string, mine: boolean, page: number) {
  const where = mine ? { buyerId: advisorId } : { status: 'ACTIVE' as const }
  const [items, total] = await Promise.all([
    prisma.requirement.findMany({ where, orderBy: { createdAt: 'desc' }, take: 20, skip: (page - 1) * 20, include: { buyer: { select: buyerSelect } } }),
    prisma.requirement.count({ where }),
  ])
  return { items, total }
}
export async function getRequirement(id: string) {
  return prisma.requirement.findUnique({ where: { id }, include: { buyer: { select: buyerSelect } } })
}
