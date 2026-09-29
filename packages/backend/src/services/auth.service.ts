import { getSupabaseClient } from '@/lib/supabase'
import { prisma } from '@/lib/prisma'
import { User, UserRole, SignUpPayload, AuthPayload, AdvisorRole, Permission } from '@shared/types'
import { Errors } from '@/utils/errors'

export class AuthService {
  async signUp(payload: SignUpPayload): Promise<{ user: User; accessToken: string }> {
    const { email, password, firstName, lastName } = payload

    try {
      const { data: authData, error: authError } = await getSupabaseClient().auth.signUp({
        email,
        password,
      })

      if (authError || !authData.user) {
        throw new Error(authError?.message || 'Failed to create user')
      }

      const userId = authData.user.id

      const user = await prisma.advisor.create({
        data: {
          id: userId,
          email,
          firstName,
          lastName,
          role: AdvisorRole.AGENT,
          status: 'ACTIVE',
          isVerified: false,
          specializations: [],
          rating: 0,
          reviewCount: 0,
        },
        include: { organization: true },
      })

      const session = authData.session
      if (!session?.access_token) {
        throw new Error('No access token returned')
      }

      return {
        user: this.mapAdvisorToUser(user),
        accessToken: session.access_token,
      }
    } catch (error) {
      throw error
    }
  }

  async signIn(payload: AuthPayload): Promise<{ user: User; accessToken: string }> {
    const { email, password } = payload

    try {
      const { data: authData, error: authError } = await getSupabaseClient().auth.signInWithPassword({
        email,
        password,
      })

      if (authError || !authData.user) {
        throw Errors.INVALID_CREDENTIALS
      }

      const session = authData.session
      if (!session?.access_token) {
        throw Errors.INVALID_CREDENTIALS
      }

      const advisor = await prisma.advisor.findUnique({
        where: { id: authData.user.id },
        include: { organization: true },
      })

      if (!advisor) {
        throw Errors.USER_NOT_FOUND
      }

      return {
        user: this.mapAdvisorToUser(advisor),
        accessToken: session.access_token,
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid login credentials') {
        throw Errors.INVALID_CREDENTIALS
      }
      throw error
    }
  }

  async getUserFromToken(accessToken: string): Promise<User> {
    try {
      const client = getSupabaseClient(accessToken)
      const { data, error } = await client.auth.getUser()

      if (error || !data.user) {
        throw Errors.INVALID_TOKEN
      }

      const advisor = await prisma.advisor.findUnique({
        where: { id: data.user.id },
        include: { organization: true },
      })

      if (!advisor) {
        throw Errors.USER_NOT_FOUND
      }

      return this.mapAdvisorToUser(advisor)
    } catch (error) {
      if (error instanceof Error && error.message.includes('expired')) {
        throw Errors.INVALID_TOKEN
      }
      throw error
    }
  }

  async updateProfile(
    userId: string,
    data: Partial<{
      firstName: string
      lastName: string
      bio: string
      profileImage: string
      phone: string
    }>
  ): Promise<User> {
    const advisor = await prisma.advisor.update({
      where: { id: userId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        bio: data.bio,
        profileImage: data.profileImage,
        phone: data.phone,
      },
    })

    return this.mapAdvisorToUser(advisor)
  }

  private mapAdvisorToUser(advisor: any): User {
    const permissions = this.getPermissionsForRole(advisor.role)
    return {
      id: advisor.id,
      email: advisor.email,
      firstName: advisor.firstName,
      lastName: advisor.lastName,
      role: advisor.role,
      profileImage: advisor.profileImage,
      bio: advisor.bio,
      organizationId: advisor.organizationId || undefined,
      organizationName: advisor.organization?.name || undefined,
      roleInOrganization: advisor.role as AdvisorRole,
      permissions,
      createdAt: advisor.createdAt,
      updatedAt: advisor.updatedAt,
    }
  }

  private getPermissionsForRole(role: any): Permission[] {
    const basePermissions = [Permission.PROPERTY_LIST, Permission.PROPERTY_CREATE, Permission.PROPERTY_DELETE]
    if (role === 'DIRECTOR') {
      return [...basePermissions, Permission.ORG_ADMIN, Permission.ADVISOR_MANAGE]
    }
    return basePermissions
  }
}

export const authService = new AuthService()
