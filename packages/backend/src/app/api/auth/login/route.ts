import { NextRequest } from 'next/server'
import { loginSchema } from '@shared/validation/auth'
import { authRoute } from '@/lib/auth-route'
import { authService } from '@/services/auth.service'
export const POST = (req: NextRequest) => authRoute(req, async (browserHash) => authService.signIn(loginSchema.parse(await req.json()), browserHash))
