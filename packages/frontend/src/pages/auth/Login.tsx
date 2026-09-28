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
      setFormError('Email and password are required')
      return
    }

    try {
      await login(formData)
      navigate('/dashboard')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Login failed')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-blue-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8">
        <div className="text-center">
          <h1 className="text-center text-5xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-4">
            Realty
          </h1>
          <h2 className="text-center text-2xl font-bold text-gray-900">Inicia sesión</h2>
          <p className="text-center text-gray-600 mt-2">Accede a tu cuenta para continuar</p>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-12 px-8 shadow-2xl rounded-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {(error || formError) && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-r-lg shadow-sm">
                <p className="font-semibold">Error de inicio de sesión</p>
                <p className="text-sm">{error || formError}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                📧 Correo electrónico
              </label>
              <input
                id="email"
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
                🔐 Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-50"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-lg shadow-lg text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '⏳ Iniciando sesión...' : '🚀 Iniciar sesión'}
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
        </div>
      </div>
    </div>
  )
}
