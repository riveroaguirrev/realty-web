import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/middleware/auth'
import { requireOrgAccess, requirePermission } from '@/lib/permissions'
import { Permission } from '@shared/types'
import { errorResponse } from '@/lib/auth-route'
import { advisorService } from '@/services/advisor.service'
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req)
    requireOrgAccess(user.organizationId, params.id)
    requirePermission(user.permissions, Permission.ADVISOR_MANAGE)
    return NextResponse.json({ success: true, data: await advisorService.listInvites(params.id) })
  } catch (error) { return errorResponse(error) }
}
