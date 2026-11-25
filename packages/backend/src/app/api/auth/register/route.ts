import { NextRequest } from 'next/server'
import { registerSchema } from '@shared/validation/auth'
import { authRoute } from '@/lib/auth-route'
import { authService } from '@/services/auth.service'
export const POST = (req: NextRequest) => authRoute(req, async () => authService.signUp(registerSchema.parse(await req.json())))
