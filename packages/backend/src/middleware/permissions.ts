import { NextRequest } from 'next/server'
import { Permission } from '@shared/types'
import { Errors } from '@/utils/errors'
import { hasPermission, canAccessOrganization } from '@/lib/permissions'

export interface AuthenticatedRequest extends NextRequest {
  userId?: string
  organizationId?: string
  permissions?: Permission[]
}

export const requirePermissionMiddleware = (requiredPermission: Permission) => {
  return (req: AuthenticatedRequest) => {
    if (!hasPermission(req.permissions, requiredPermission)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: Errors.FORBIDDEN.message, code: Errors.FORBIDDEN.code },
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
    return null
  }
}

export const requireOrgAccessMiddleware = (targetOrgId: string) => {
  return (req: AuthenticatedRequest) => {
    if (!canAccessOrganization(req.organizationId, targetOrgId)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: Errors.FORBIDDEN.message, code: Errors.FORBIDDEN.code },
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
    return null
  }
}
