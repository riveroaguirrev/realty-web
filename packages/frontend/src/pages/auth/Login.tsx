import { AuthLayout } from '@/components/layout/AuthLayout'
import { FormEvent, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export const Login = () => {
  const navigate = useNavigate()
  const { login, isLoading, error } = useAuth()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormError(null)

    if (!formData.email || !formData.password) {
      setFormError('Escribe tu correo y contraseña para continuar')
      return
    }

    try {
      await login(formData)
      navigate('/dashboard')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No pudimos iniciar sesión. Revisa tus datos.')
    }
  }

  return (
    <AuthLayout title="Inicia sesión" description="Qué bueno verte de nuevo. Continúa donde lo dejaste.">
          <form onSubmit={handleSubmit} className="space-y-6">
            {(error || formError) && (
              <div role="alert" className="bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-r-lg shadow-sm">
                <p className="font-semibold">Error de inicio de sesión</p>
                <p className="text-sm">{error || formError}</p>
              </div>
            )}

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
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-50"
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
                autoComplete="current-password" required
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-50"
                disabled={isLoading}
              />
                <button type="button" className="password-toggle" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Ocultar' : 'Mostrar'}</button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-lg shadow-lg text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t-2 border-gray-100">
            <p className="text-center text-gray-600">
              ¿No tienes cuenta?{' '}
              <Link to="/auth/register" className="text-blue-600 hover:text-blue-700 font-bold transition-colors">
                Crea una ahora
              </Link>
            </p>
          </div>
    </AuthLayout>
  )
}
