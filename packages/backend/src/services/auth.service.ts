import type { Session, User as SupabaseUser } from '@supabase/supabase-js'
import type { Prisma } from '@prisma/client'
import { getSupabaseClient, supabase } from '@/lib/supabase'
import { prisma } from '@/lib/prisma'
import { serializable } from '@/lib/transactions'
import { User, SignUpPayload, AuthPayload, AdvisorRole, Permission, UserRole, AuthResponse, LoginResult } from '@shared/types'
import { emailSchema, profileSchema, registerSchema } from '@shared/validation/auth'
import { ApiError, Errors } from '@/utils/errors'
import { activateSession, consumeChallenge, getChallenge, rateLimit, sessionId, sessionIsAllowed } from './session.service'

type AdvisorWithOrg = Prisma.AdvisorGetPayload<{ include: { organization: true } }>
const expiry = () => new Date(Date.now() + 10 * 60 * 1000)
const deliveryError = () => new ApiError(503, 'EMAIL_DELIVERY_FAILED', 'No pudimos enviar el correo. Inténtalo de nuevo más tarde.')

export class AuthService {
  async ensureProfile(authUser: SupabaseUser) {
    const existing = await prisma.advisor.findUnique({ where: { id: authUser.id }, include: { organization: true } })
    if (existing) {
      if (authUser.email_confirmed_at && authUser.email && existing.email !== authUser.email.toLowerCase()) {
        return prisma.advisor.update({ where: { id: existing.id }, data: { email: authUser.email.toLowerCase() }, include: { organization: true } })
      }
      return existing
    }
    const metadata = authUser.user_metadata
    const parsed = registerSchema.omit({ password: true }).safeParse({
      email: authUser.email, firstName: metadata.firstName, lastName: metadata.lastName, role: metadata.role,
    })
    if (!parsed.success) throw new ApiError(409, 'PROFILE_INCOMPLETE', 'Tu perfil está incompleto. Contacta a soporte.')
    const data = parsed.data
    return prisma.advisor.upsert({
      where: { id: authUser.id }, update: {},
      create: { id: authUser.id, email: data.email, firstName: data.firstName, lastName: data.lastName, userRole: data.role, specializations: [] },
      include: { organization: true },
    })
  }
  async signUp(payload: SignUpPayload): Promise<LoginResult> {
    await rateLimit('mail:' + payload.email, 1, 60)
    const { data, error } = await getSupabaseClient().auth.signUp({
      email: payload.email, password: payload.password,
      options: { data: { firstName: payload.firstName, lastName: payload.lastName, role: payload.role } },
    })
    if (error) {
      if (error.code === 'user_already_exists') return { status: 'EMAIL_VERIFICATION_REQUIRED', email: payload.email }
      throw deliveryError()
    }
    if (!data.user) throw deliveryError()
    // Supabase can return an obfuscated user for an existing account.
    if (data.user.identities?.length) await this.ensureProfile(data.user)
    if (data.session) {
      await supabase.auth.admin.signOut(data.session.access_token, 'local')
      throw new ApiError(503, 'AUTH_CONFIGURATION_ERROR', 'La confirmación de correo debe estar activada antes de registrar usuarios.')
    }
    return { status: 'EMAIL_VERIFICATION_REQUIRED', email: payload.email }
  }
  async signIn(payload: AuthPayload, browserHash: string): Promise<LoginResult> {
    await rateLimit('login:' + payload.email, 10, 600)
    const { data, error } = await getSupabaseClient().auth.signInWithPassword(payload)
    if (error?.code === 'email_not_confirmed') return { status: 'EMAIL_VERIFICATION_REQUIRED', email: payload.email }
    if (error || !data.user || !data.session) throw Errors.INVALID_CREDENTIALS
    if (!data.user.email_confirmed_at) throw Errors.EMAIL_NOT_VERIFIED
    const advisor = await this.ensureProfile(data.user)
    if (advisor.status === 'BLOCKED' || advisor.status === 'INACTIVE') throw Errors.ACCOUNT_BLOCKED
    if (advisor.userRole === 'ADVISOR' && advisor.authorizedBrowserHash !== browserHash) {
      await supabase.auth.admin.signOut(data.session.access_token, 'local')
      await rateLimit('mail:' + payload.email, 1, 60)
      const sent = await getSupabaseClient().auth.signInWithOtp({ email: payload.email, options: { shouldCreateUser: false } })
      if (sent.error) throw deliveryError()
      const challenge = await prisma.authChallenge.create({
        data: { userId: advisor.id, purpose: 'device', email: payload.email, browserHash, expiresAt: expiry(), credentialsVersion: advisor.credentialsVersion },
      })
      return { status: 'DEVICE_VERIFICATION_REQUIRED', email: payload.email, challengeId: challenge.id }
    }
    return this.authorize(data.session, advisor.id, browserHash, false, true)
  }
  private response(advisor: AdvisorWithOrg, session: Session): AuthResponse {
    return { status: 'AUTHENTICATED', user: this.mapAdvisorToUser(advisor), accessToken: session.access_token, refreshToken: session.refresh_token }
  }
  async authorize(session: Session, userId: string, browserHash: string, revokeAll = false, trustedBrowserOnly = false): Promise<AuthResponse> {
    const advisor = await serializable((tx) => activateSession(tx, userId, sessionId(session.access_token), browserHash, revokeAll, trustedBrowserOnly))
    return this.response(advisor, session)
  }
  async verify(input: { purpose: string; email: string; code: string; challengeId?: string }, browserHash: string, token?: string) {
    await rateLimit('verify:' + input.email + ':' + input.purpose, 5, 600)
    const client = getSupabaseClient()
    if (input.purpose === 'email_change') {
      if (!token) throw Errors.UNAUTHORIZED
      const user = await this.getUserFromToken(token, browserHash)
      const challenge = await getChallenge(input.challengeId, browserHash, 'email_change')
      if (challenge.userId !== user.id || ![challenge.email, challenge.newEmail].includes(input.email)) throw Errors.INVALID_CODE
      const verified = await client.auth.verifyOtp({ email: input.email, token: input.code, type: 'email_change' })
      if (verified.error) throw Errors.INVALID_CODE
      const current = await supabase.auth.admin.getUserById(user.id)
      if (current.error || !current.data.user) throw Errors.INVALID_CODE
      if (current.data.user.email?.toLowerCase() !== challenge.newEmail) return { status: 'EMAIL_CHANGE_PENDING' as const }
      await serializable(async (tx) => {
        await consumeChallenge(tx, challenge.id, browserHash, 'email_change')
        await tx.advisor.update({ where: { id: user.id }, data: { email: challenge.newEmail! } })
      })
      if (verified.data.session) return this.authorize(verified.data.session, user.id, browserHash)
      return { status: 'EMAIL_CHANGED' as const, user: this.mapAdvisorToUser(await this.ensureProfile(current.data.user)) }
    }
    const challenge = input.purpose === 'device' ? await getChallenge(input.challengeId, browserHash, 'device') : null
    if (challenge && challenge.email !== input.email) throw Errors.INVALID_CODE
    const { data, error } = await client.auth.verifyOtp({
      email: input.email, token: input.code, type: input.purpose === 'recovery' ? 'recovery' : input.purpose === 'signup' ? 'signup' : 'email',
    })
    if (error || !data.session || !data.user || !data.user.email_confirmed_at) throw Errors.INVALID_CODE
    const advisor = await this.ensureProfile(data.user)
    if (input.purpose === 'recovery') {
      const grant = await prisma.authChallenge.create({
        data: { userId: advisor.id, purpose: 'recovery', email: input.email, browserHash, sessionId: sessionId(data.session.access_token), expiresAt: expiry(), credentialsVersion: advisor.credentialsVersion },
      })
      return { status: 'PASSWORD_RESET_REQUIRED' as const, challengeId: grant.id, recoveryToken: data.session.access_token }
    }
    if (challenge) {
      if (challenge.userId !== data.user.id) throw Errors.INVALID_CODE
      const authorized = await serializable(async (tx) => {
        await consumeChallenge(tx, challenge.id, browserHash, 'device')
        return activateSession(tx, advisor.id, sessionId(data.session!.access_token), browserHash)
      })
      return this.response(authorized, data.session)
    }
    return this.authorize(data.session, advisor.id, browserHash)
  }
  async resend(input: { purpose: string; email: string; challengeId?: string }, browserHash: string, token?: string) {
    if (input.purpose === 'device' || input.purpose === 'email_change') {
      const challenge = await getChallenge(input.challengeId, browserHash, input.purpose)
      if (challenge.email !== input.email) throw Errors.INVALID_CODE
      if (input.purpose === 'email_change' && (!token || (await this.getUserFromToken(token, browserHash)).id !== challenge.userId)) throw Errors.UNAUTHORIZED
    }
    await rateLimit('mail:' + input.email, 1, 60)
    await rateLimit('mail-hour:' + input.email, 10, 3600)
    const client = getSupabaseClient()
    const result = input.purpose === 'recovery'
      ? await client.auth.resetPasswordForEmail(input.email)
      : input.purpose === 'device'
        ? await client.auth.signInWithOtp({ email: input.email, options: { shouldCreateUser: false } })
        : await client.auth.resend({ type: input.purpose === 'signup' ? 'signup' : 'email_change', email: input.email })
    if (result.error && !['user_not_found', 'user_already_exists'].includes(result.error.code ?? '')) throw deliveryError()
    if (input.challengeId) await prisma.authChallenge.update({ where: { id: input.challengeId }, data: { expiresAt: expiry() } })
    return { message: 'Si la cuenta corresponde, recibirás un código en tu correo.' }
  }
  async resetPassword(input: { challengeId: string; recoveryToken: string; password: string }, browserHash: string) {
    const challenge = await getChallenge(input.challengeId, browserHash, 'recovery')
    const { data, error } = await getSupabaseClient().auth.getUser(input.recoveryToken)
    if (error || data.user?.id !== challenge.userId || sessionId(input.recoveryToken) !== challenge.sessionId) throw Errors.INVALID_CODE
    await serializable((tx) => consumeChallenge(tx, challenge.id, browserHash, 'recovery'))
    const changed = await supabase.auth.admin.updateUserById(challenge.userId, { password: input.password })
    if (changed.error) throw new ApiError(400, 'PASSWORD_CHANGE_FAILED', 'No pudimos cambiar la contraseña. Solicita un nuevo código.')
    await serializable(async (tx) => {
      await tx.accountSession.updateMany({ where: { advisorId: challenge.userId, revokedAt: null }, data: { revokedAt: new Date() } })
      await tx.advisor.update({ where: { id: challenge.userId }, data: { activeSessionId: null, authorizedBrowserHash: browserHash, credentialsVersion: { increment: 1 } } })
      await tx.authChallenge.updateMany({ where: { userId: challenge.userId, consumedAt: null }, data: { consumedAt: new Date() } })
    })
    await supabase.auth.admin.signOut(input.recoveryToken, 'global')
    return { message: 'Contraseña actualizada. Inicia sesión con tu nueva contraseña.' }
  }
  async getUserFromToken(accessToken: string, browserHash?: string): Promise<User> {
    const { data, error } = await getSupabaseClient().auth.getUser(accessToken)
    if (error && (error.name === 'AuthRetryableFetchError' || (error.status ?? 0) >= 500)) {
      throw new ApiError(503, 'AUTH_UNAVAILABLE', 'No pudimos comprobar tu sesión. Inténtalo de nuevo más tarde.')
    }
    if (error || !data.user) throw Errors.INVALID_TOKEN
    if (!data.user.email_confirmed_at) throw Errors.EMAIL_NOT_VERIFIED
    const advisor = await this.ensureProfile(data.user)
    if (advisor.status === 'BLOCKED' || advisor.status === 'INACTIVE') throw Errors.ACCOUNT_BLOCKED
    const session = await prisma.accountSession.findUnique({ where: { id: sessionId(accessToken) } })
    if (!sessionIsAllowed(advisor, session, advisor.id)) throw Errors.SESSION_REPLACED
    if (browserHash !== undefined && session!.browserHash !== browserHash) throw Errors.SESSION_REPLACED
    const native = await prisma.$queryRaw<{ active: boolean }[]>`SELECT EXISTS(SELECT 1 FROM auth.sessions WHERE id = ${session!.id}::uuid AND user_id = ${advisor.id}::uuid) AS active`
    if (!native[0]?.active) throw Errors.INVALID_TOKEN
    return this.mapAdvisorToUser(advisor)
  }
  async updateProfile(userId: string, input: unknown): Promise<User> {
    const data = profileSchema.parse(input)
    const advisor = await prisma.advisor.update({ where: { id: userId }, data: { ...data, phone: data.phone === '' ? null : data.phone }, include: { organization: true } })
    return this.mapAdvisorToUser(advisor)
  }
  private async reauthenticate(token: string, password: string, browserHash: string) {
    const user = await this.getUserFromToken(token, browserHash)
    await rateLimit('reauth:' + user.id, 10, 600)
    const client = getSupabaseClient()
    const signed = await client.auth.signInWithPassword({ email: user.email, password })
    if (signed.error || signed.data.user?.id !== user.id || !signed.data.session) throw Errors.INVALID_CREDENTIALS
    return { client, user, session: signed.data.session }
  }
  async changePassword(token: string, input: { currentPassword: string; password: string }, browserHash: string) {
    const { client, user, session } = await this.reauthenticate(token, input.currentPassword, browserHash)
    const changed = await client.auth.updateUser({ password: input.password, current_password: input.currentPassword })
    if (changed.error) throw new ApiError(400, 'PASSWORD_CHANGE_FAILED', 'No pudimos cambiar la contraseña. Revisa sus requisitos.')
    await serializable(async (tx) => {
      await tx.advisor.update({ where: { id: user.id }, data: { credentialsVersion: { increment: 1 } } })
      await tx.authChallenge.updateMany({ where: { userId: user.id, consumedAt: null }, data: { consumedAt: new Date() } })
    })
    return this.authorize(session, user.id, browserHash, true)
  }
  async changeEmail(token: string, input: { email: string; currentPassword: string }, browserHash: string) {
    const { client, user, session } = await this.reauthenticate(token, input.currentPassword, browserHash)
    if (input.email === user.email) throw new ApiError(400, 'EMAIL_UNCHANGED', 'Escribe un correo diferente al actual.')
    await rateLimit('mail:' + user.email, 1, 60)
    const changed = await client.auth.updateUser({ email: emailSchema.parse(input.email) })
    await supabase.auth.admin.signOut(session.access_token, 'local')
    if (changed.error) throw deliveryError()
    const challenge = await prisma.authChallenge.create({
      data: { userId: user.id, purpose: 'email_change', email: user.email, newEmail: input.email, browserHash, expiresAt: expiry(), credentialsVersion: (await prisma.advisor.findUniqueOrThrow({ where: { id: user.id } })).credentialsVersion },
    })
    return { challengeId: challenge.id, email: user.email, newEmail: input.email }
  }
  async logout(token: string, browserHash?: string) {
    const user = await this.getUserFromToken(token, browserHash)
    const id = sessionId(token)
    await serializable(async (tx) => {
      await tx.accountSession.updateMany({ where: { id, advisorId: user.id }, data: { revokedAt: new Date() } })
      await tx.advisor.updateMany({ where: { id: user.id, activeSessionId: id }, data: { activeSessionId: null } })
    })
    await supabase.auth.admin.signOut(token, 'local')
    return { message: 'Sesión cerrada.' }
  }
  mapAdvisorToUser(advisor: AdvisorWithOrg): User {
    const permissions: Permission[] = [Permission.PROPERTY_LIST]
    if (advisor.userRole === 'ADVISOR') {
      permissions.push(Permission.PROPERTY_CREATE, Permission.PROPERTY_DELETE)
      if (advisor.role === 'DIRECTOR' && advisor.organizationId) permissions.push(Permission.ORG_ADMIN, Permission.ADVISOR_MANAGE)
    }
    return {
      id: advisor.id, email: advisor.email, firstName: advisor.firstName, lastName: advisor.lastName,
      role: advisor.userRole as UserRole, phone: advisor.phone ?? undefined, profileImage: advisor.profileImage ?? undefined,
      bio: advisor.bio ?? undefined, organizationId: advisor.organizationId ?? undefined,
      organizationName: advisor.organization?.name, roleInOrganization: advisor.role as AdvisorRole,
      permissions, createdAt: advisor.createdAt, updatedAt: advisor.updatedAt,
    }
  }
}
export const authService = new AuthService()
