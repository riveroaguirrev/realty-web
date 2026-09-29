import { AuthLayout } from '@/components/layout/AuthLayout'
import { FormEvent, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { UserRole } from '@shared/types'

export const Register = () => {
  const navigate = useNavigate()
  const { register, isLoading, error } = useAuth()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: UserRole.ADVISOR as UserRole,
  })

  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormError(null)

    if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
      setFormError('Completa todos los campos para crear tu cuenta')
      return
    }

    try {
      await register(formData)
      navigate('/auth/profile')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No pudimos crear tu cuenta. Inténtalo de nuevo.')
    }
  }

  return (
    <AuthLayout title="Crea tu cuenta" description="Todo lo que necesitas para dar el siguiente paso.">
          <form onSubmit={handleSubmit} className="space-y-5">
            {(error || formError) && (
              <div role="alert" className="bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-r-lg shadow-sm">
                <p className="font-semibold">Error al registrar</p>
                <p className="text-sm">{error || formError}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre
                </label>
                <input
                  id="firstName" autoComplete="given-name" required
                  name="firstName"
                  type="text"
                  placeholder="Juan"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all disabled:opacity-50"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 mb-2">
                  Apellido
                </label>
                <input
                  id="lastName" autoComplete="family-name" required
                  name="lastName"
                  type="text"
                  placeholder="Pérez"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all disabled:opacity-50"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Correo electrónico
              </label>
              <input
                id="email"
                autoComplete="email" required
                name="email"
                type="email"
                placeholder="tu@email.com"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all disabled:opacity-50"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Contraseña
              </label>
              <div className="password-wrap">
              <input
                id="password"
                autoComplete="new-password" required minLength={8}
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Al menos 8 caracteres"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all disabled:opacity-50"
                disabled={isLoading}
              />
                <button type="button" className="password-toggle" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Ocultar' : 'Mostrar'}</button>
              </div>
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-semibold text-gray-700 mb-2">
                Tipo de usuario
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all disabled:opacity-50"
                disabled={isLoading}
              >
                <option value={UserRole.BUYER}>Comprador</option>
                <option value={UserRole.ADVISOR}>Asesor Inmobiliario</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-lg shadow-lg text-base font-semibold text-white bg-gradient-to-r from-green-600 to-green-700 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t-2 border-gray-100">
            <p className="text-center text-gray-600">
              ¿Ya tienes cuenta?{' '}
              <Link to="/auth/login" className="text-green-600 hover:text-green-700 font-bold transition-colors">
                Inicia sesión aquí
              </Link>
            </p>
          </div>
    </AuthLayout>
  )
}
