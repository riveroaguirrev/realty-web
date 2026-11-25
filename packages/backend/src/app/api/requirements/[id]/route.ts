import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticatedRoute, RouteError } from '@/utils/authenticatedRoute'
import { getRequirement, getRequirementDetail, requirementSuggestions, updateRequirement } from '@/services/requirement.service'
import { requirementInput } from '@/utils/requirementInput'
export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return authenticatedRoute(request, async advisorId => {
    const { id } = await params
    const requirement = await getRequirementDetail(id, advisorId)
    if (!requirement) throw new RouteError(404, 'Requerimiento no encontrado.')
    const filters = z.object({
      minScore: z.coerce.number().int().min(0).max(100),
      withinBudget: z.enum(['true', 'false']).transform(value => value === 'true'),
    }).parse({
      minScore: request.nextUrl.searchParams.get('minScore') ?? 0,
      withinBudget: request.nextUrl.searchParams.get('withinBudget') ?? 'false',
    })
    return NextResponse.json({ success: true, data: { ...requirement, suggestions: await requirementSuggestions(id, filters, advisorId) } }, { headers: { 'Cache-Control': 'no-store' } })
  })
}
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return authenticatedRoute(request, async advisorId => {
    const { id } = await params
    const body = await request.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new RouteError(400, 'Datos inválidos.')
    const data = Object.keys(body).length === 1 && 'status' in body
      ? z.object({ status: z.enum(['ACTIVE', 'PAUSED', 'FULFILLED']) }).parse(body)
      : Object.keys(body).length === 1 && 'visibility' in body
        ? z.object({ visibility: z.enum(['PUBLIC', 'ORGANIZATION']) }).parse(body)
        : requirementInput.parse(body)
    await updateRequirement(id, advisorId, data)
    return NextResponse.json({ success: true, data: await getRequirement(id, advisorId) })
  })
}
