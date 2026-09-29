import { Permission } from '@shared/types'
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
}

export const canManageProperty = (actor: PropertyActor, property: PropertyOwnership): boolean => {
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
