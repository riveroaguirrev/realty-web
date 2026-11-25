import { Permission, UserRole } from '@shared/types'
import type { Prisma } from '@prisma/client'
import { Errors } from '@/utils/errors'

export const isOrgAdmin = (permissions?: Permission[]): boolean => {
  return !!permissions?.includes(Permission.ORG_ADMIN)
}

export const hasPermission = (permissions: Permission[] | undefined, permission: Permission): boolean => {
  return !!permissions?.includes(permission)
}

export const requireOrgAdmin = (permissions?: Permission[]): void => {
  if (!isOrgAdmin(permissions)) {
    throw Errors.FORBIDDEN
  }
}

export const requirePermission = (permissions: Permission[] | undefined, permission: Permission): void => {
  if (!hasPermission(permissions, permission)) {
    throw Errors.FORBIDDEN
  }
}

export const canAccessOrganization = (advisorOrgId: string | null | undefined, targetOrgId: string): boolean => {
  return advisorOrgId === targetOrgId
}

export const requireOrgAccess = (advisorOrgId: string | null | undefined, targetOrgId: string): void => {
  if (!canAccessOrganization(advisorOrgId, targetOrgId)) {
    throw Errors.FORBIDDEN
  }
}

interface PropertyOwnership {
  advisorId: string
  organizationId: string | null
}

interface PropertyActor {
  id: string
  organizationId?: string
  permissions?: Permission[]
  role?: UserRole
}

export const canManageProperty = (actor: PropertyActor, property: PropertyOwnership): boolean => {
  if (actor.role === UserRole.BUYER) return false
  if (property.advisorId === actor.id) return true

  const isDirectorOfSameOrganization =
    isOrgAdmin(actor.permissions) &&
    !!property.organizationId &&
    property.organizationId === actor.organizationId
  return isDirectorOfSameOrganization
}

export const requirePropertyManagement = (actor: PropertyActor, property: PropertyOwnership): void => {
  if (!canManageProperty(actor, property)) {
    throw Errors.FORBIDDEN
  }
}

export const visiblePropertyWhere = (actor: PropertyActor): Prisma.PropertyWhereInput => {
  const published: Prisma.PropertyWhereInput = { status: { not: 'ARCHIVED' }, ...propertyAudienceWhere(actor) }
  if (actor.role === UserRole.BUYER) return published

  const accessible: Prisma.PropertyWhereInput[] = [published, { advisorId: actor.id }]
  if (actor.organizationId && isOrgAdmin(actor.permissions)) {
    accessible.push({ organizationId: actor.organizationId })
  }
  return { OR: accessible }
}

// Membership is supplied by verified authentication, never by search parameters.
export const propertyAudienceWhere = (actor?: Pick<PropertyActor, 'id' | 'organizationId'> | null): Prisma.PropertyWhereInput => ({
  OR: [
    { visibility: 'PUBLIC' },
    ...(actor ? [{ advisorId: actor.id }] : []),
    ...(actor?.organizationId ? [{ visibility: 'ORGANIZATION', organizationId: actor.organizationId }] : []),
  ],
})
