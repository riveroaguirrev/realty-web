import { User } from '@shared/types'

interface OwnedProperty {
  advisorId: string
  organizationId?: string | null
}

const ORG_ADMIN_PERMISSION = 'org:admin'

export const canManageProperty = (user: User | null, property: OwnedProperty): boolean => {
  if (!user) return false
  if (property.advisorId === user.id) return true

  const isOrgAdmin = user.permissions?.some((permission) => permission === ORG_ADMIN_PERMISSION)
  return Boolean(isOrgAdmin && property.organizationId && property.organizationId === user.organizationId)
}
