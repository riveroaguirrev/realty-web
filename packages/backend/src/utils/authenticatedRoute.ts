import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { supabase } from '@/lib/supabase'
import { prisma } from '@/lib/prisma'
export class RouteError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
export async function authenticatedRoute(request: NextRequest, handler: (advisorId: string) => Promise<NextResponse>) {
  try {
    const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1]
    if (!token) throw new RouteError(401, 'Inicia sesión para continuar.')
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) throw new RouteError(401, 'Tu sesión venció. Inicia sesión nuevamente.')
    const advisor = await prisma.advisor.findUnique({ where: { id: user.id }, select: { status: true } })
    if (advisor?.status !== 'ACTIVE') throw new RouteError(403, 'Tu cuenta no está activa.')
    return await handler(user.id)
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ success: false, error: { code: 'VALIDATION', message: error.issues[0].message } }, { status: 400 })
    if (error instanceof SyntaxError) return NextResponse.json({ success: false, error: { code: 'VALIDATION', message: 'Datos inválidos.' } }, { status: 400 })
    if (error instanceof RouteError) return NextResponse.json({ success: false, error: { code: 'REQUEST_ERROR', message: error.message } }, { status: error.status })
    console.error('Requirements/notifications API failed', error)
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'No se pudo completar la solicitud.' } }, { status: 500 })
  }
}
