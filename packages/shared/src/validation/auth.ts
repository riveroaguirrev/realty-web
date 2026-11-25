import { z } from 'zod'
import { UserRole } from '../types'

export const emailSchema = z.string().trim().toLowerCase().max(254).email('Escribe un correo electrónico válido')
const phoneFormatError = 'Escribe un celular con prefijo internacional, por ejemplo +591 71234567.'
export const contactPhoneSchema = z.string({ required_error: 'Escribe tu celular.', invalid_type_error: phoneFormatError })
  .trim().max(40, phoneFormatError)
  .transform(value => value.replace(/[\s()-]/g, ''))
  .refine(value => /^\+[1-9]\d{6,14}$/.test(value), phoneFormatError)
const nameSchema = z.string().trim().min(1, 'Este campo es obligatorio').max(100, 'Máximo 100 caracteres')
  .transform((value) => value.replace(/\s+/g, ' '))
export const passwordSchema = z.string().refine((value) => Array.from(value).length >= 12, 'Usa al menos 12 caracteres')
  .refine((value) => new TextEncoder().encode(value).length <= 72, 'La contraseña supera el límite de 72 bytes de bcrypt')
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Escribe tu contraseña').max(1024),
}).strict()
export const registerSchema = loginSchema.extend({
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  phone: contactPhoneSchema,
  role: z.literal(UserRole.ADVISOR, { errorMap: () => ({ message: 'El registro está disponible para asesores inmobiliarios.' }) }),
}).strict()
export const registrationFormSchema = registerSchema.extend({ confirmPassword: z.string().min(1, 'Repite tu contraseña') })
  .refine((data) => data.password === data.confirmPassword, { path: ['confirmPassword'], message: 'Las contraseñas no coinciden' })
export const passwordFormSchema = z.object({ password: passwordSchema, confirmPassword: z.string().min(1, 'Repite tu contraseña') })
  .refine((data) => data.password === data.confirmPassword, { path: ['confirmPassword'], message: 'Las contraseñas no coinciden' })
export const profileSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  bio: z.string().trim().max(1000, 'Máximo 1000 caracteres').optional(),
  phone: contactPhoneSchema.or(z.string().trim().length(0)).optional(),
}).strict()
export const advisorProfileSchema = profileSchema.extend({ phone: contactPhoneSchema.optional() })
export const codeSchema = z.string().trim().regex(/^\d{6}$/, 'Escribe el código de 6 dígitos')
export const verifySchema = z.object({
  purpose: z.enum(['signup', 'device', 'recovery', 'email_change']),
  email: emailSchema,
  code: codeSchema,
  challengeId: z.string().uuid().optional(),
}).strict()
export const resendSchema = z.discriminatedUnion('purpose', [
  z.object({ purpose: z.literal('signup'), email: emailSchema }).strict(),
  z.object({ purpose: z.literal('recovery'), email: emailSchema }).strict(),
  z.object({ purpose: z.literal('device'), email: emailSchema, challengeId: z.string().uuid() }).strict(),
  z.object({ purpose: z.literal('email_change'), email: emailSchema, challengeId: z.string().uuid() }).strict(),
])
export type ResendInput = z.infer<typeof resendSchema>
export const resetSchema = passwordFormSchema.and(z.object({
  challengeId: z.string().uuid(), recoveryToken: z.string().min(1),
}))
export const changePasswordSchema = passwordFormSchema.and(z.object({ currentPassword: z.string().min(1).max(1024) }))
export const changeEmailSchema = z.object({ email: emailSchema, currentPassword: z.string().min(1).max(1024) }).strict()
export const organizationSchema = z.object({
  name: nameSchema,
  city: nameSchema,
  region: nameSchema,
  email: emailSchema.or(z.literal('')).optional(),
  phone: z.string().trim().regex(/^(\+[1-9]\d{6,14})?$/, 'Usa el prefijo internacional y entre 7 y 15 dígitos').optional(),
  website: z.string().url().or(z.literal('')).optional(),
  slug: z.string().trim().min(1).max(100).optional(),
  logo: z.string().url().max(2048).optional(),
}).strict()
export const fieldsFromError = (error: z.ZodError): Record<string, string[]> => {
  const fields: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const key = issue.path[0]?.toString() ?? '_form'
    ;(fields[key] ??= []).push(issue.message)
  }
  return fields
}
