import { UserRole } from '@shared/types'

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const validatePassword = (password: string): boolean => {
  return password && password.length >= 6
}

export const validateSignUp = (payload: any) => {
  const errors: string[] = []

  if (!payload.email || !validateEmail(payload.email)) {
    errors.push('Valid email is required')
  }

  if (!payload.password || !validatePassword(payload.password)) {
    errors.push('Password must be at least 6 characters')
  }

  if (!payload.firstName || payload.firstName.trim().length === 0) {
    errors.push('First name is required')
  }

  if (!payload.lastName || payload.lastName.trim().length === 0) {
    errors.push('Last name is required')
  }

  if (!payload.role || !Object.values(UserRole).includes(payload.role)) {
    errors.push('Valid role (ADVISOR or BUYER) is required')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export const validateLogin = (payload: any) => {
  const errors: string[] = []

  if (!payload.email || !validateEmail(payload.email)) {
    errors.push('Valid email is required')
  }

  if (!payload.password) {
    errors.push('Password is required')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
