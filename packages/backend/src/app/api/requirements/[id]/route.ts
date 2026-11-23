import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticatedRoute, RouteError } from '@/utils/authenticatedRoute'
import { getRequirement, requirementSuggestions } from '@/services/requirement.service'
import { requirementInput } from '@/utils/requirementInput'
import { prisma } from '@/lib/prisma'
export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return authenticatedRoute(request, async advisorId => {
    const { id } = await params
    const requirement = await getRequirement(id, advisorId)
    if (!requirement) throw new RouteError(404, 'Requerimiento no encontrado.')
    const filters = z.object({
      minScore: z.coerce.number().int().min(0).max(100),
      withinBudget: z.enum(['true', 'false']).transform(value => value === 'true'),
    }).parse({
      minScore: request.nextUrl.searchParams.get('minScore') ?? 0,
      withinBudget: request.nextUrl.searchParams.get('withinBudget') ?? 'false',
    })
    return NextResponse.json({ success: true, data: { ...requirement, suggestions: await requirementSuggestions(id, filters) } })
  })
}
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return authenticatedRoute(request, async advisorId => {
    const { id } = await params
    const body = await request.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new RouteError(400, 'Datos inválidos.')
    const data = Object.keys(body).length === 1 && 'status' in body
      ? z.object({ status: z.enum(['ACTIVE', 'PAUSED', 'FULFILLED']) }).parse(body)
      : requirementInput.parse(body)
    const changed = await prisma.requirement.updateMany({ where: { id, buyerId: advisorId }, data })
    if (!changed.count) throw new RouteError(404, 'No puedes modificar este requerimiento.')
    return NextResponse.json({ success: true, data: await getRequirement(id, advisorId) })
  })
}
