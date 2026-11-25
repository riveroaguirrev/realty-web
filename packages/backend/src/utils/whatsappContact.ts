import { contactPhoneSchema } from '@shared/validation/auth'

export function whatsappPhoneFor(advisor: { id: string; status: string; userRole: string; phone: string | null }, viewerId: string) {
  if (advisor.id === viewerId || advisor.status !== 'ACTIVE' || advisor.userRole !== 'ADVISOR') return null
  const phone = contactPhoneSchema.safeParse(advisor.phone)
  return phone.success ? phone.data : null
}
