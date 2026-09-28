import { Permission, AdvisorRole } from '@shared/types'
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
