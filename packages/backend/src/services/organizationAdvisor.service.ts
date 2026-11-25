import { prisma } from '@/lib/prisma'
import { ApiError, Errors } from '@/utils/errors'
import { propertyCardSelect } from '@/utils/propertyView'
import { whatsappPhoneFor } from '@/utils/whatsappContact'

export const organizationAdvisorProfileSelect = {
  id: true, firstName: true, lastName: true, email: true, phone: true,
  profileImage: true, bio: true, role: true, status: true, licenseNumber: true,
  yearsExperience: true, specializations: true, language: true, rating: true,
  reviewCount: true, isVerified: true, createdAt: true,
} as const

export async function getOrganizationAdvisorDetail(requesterId: string, organizationId: string, advisorId: string, page = 1) {
  // Check the current persisted role and membership; do not trust client-supplied roles.
  const director = await prisma.advisor.findFirst({
    where: { id: requesterId, organizationId, role: 'DIRECTOR', userRole: 'ADVISOR', status: 'ACTIVE' },
    select: { id: true },
  })
  if (!director) throw Errors.FORBIDDEN
  const advisor = await prisma.advisor.findFirst({
    where: { id: advisorId, organizationId, userRole: 'ADVISOR' },
    select: organizationAdvisorProfileSelect,
  })
  if (!advisor) throw new ApiError(404, 'ADVISOR_NOT_FOUND', 'Este asesor ya no pertenece a tu organización o no existe.')
  const pageSize = 12
  const safePage = Number.isSafeInteger(page) && page > 0 ? Math.min(page, 10000) : 1
  const where = { advisorId, organizationId }
  const [properties, groups] = await Promise.all([
    prisma.property.findMany({ where, select: { ...propertyCardSelect, status: true }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: pageSize, skip: (safePage - 1) * pageSize }),
    prisma.property.groupBy({ by: ['status'], where, _count: { _all: true } }),
  ])
  const count = (status: string) => groups.find(group => group.status === status)?._count._all ?? 0
  const total = groups.reduce((sum, group) => sum + group._count._all, 0)
  return {
    advisor: { ...advisor, whatsappPhone: whatsappPhoneFor({ ...advisor, userRole: 'ADVISOR' }, requesterId) }, properties,
    summary: { total, available: count('AVAILABLE'), closed: count('SOLD') + count('RENT'), archived: count('ARCHIVED') },
    pagination: { page: safePage, pageSize, total, pages: Math.ceil(total / pageSize) },
  }
}
