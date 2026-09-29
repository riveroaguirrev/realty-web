import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOrganization } from '@/hooks/useOrganization'

export const OrganizationSetup = () => {
  const navigate = useNavigate()
  const { createOrganization, acceptInvite, isLoading, error, clearError } = useOrganization()

  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    region: '',
    email: '',
    phone: '',
  })
  const [inviteCode, setInviteCode] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    try {
      await createOrganization(formData.name, {
        city: formData.city,
        region: formData.region,
        email: formData.email,
        phone: formData.phone,
      })
      navigate('/organization/dashboard')
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'No pudimos crear la inmobiliaria.')
    }
  }

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    if (!inviteCode.trim()) {
      setLocalError('Please enter an invite code')
      return
    }

    try {
      await acceptInvite(inviteCode)
      navigate('/organization/dashboard')
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'No pudimos aceptar la invitación.')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const displayError = localError || error

  return (
    <div className="page-surface">

      <div className="form-container">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Organización</h2>
            <p className="text-sm text-gray-600 mt-1">
              Crea una nueva inmobiliaria o únete a una existente
            </p>
          </div>

          <div className="px-6 py-4">
            {displayError && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {displayError}
              </div>
            )}

            <div className="flex space-x-4 mb-6 border-b border-gray-200">
              <button
                onClick={() => {
                  setTab('create')
                  setLocalError(null)
                  clearError()
                }}
                className={`px-4 py-2 font-medium text-sm border-b-2 ${
                  tab === 'create'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Crear Nueva
              </button>
              <button
                onClick={() => {
                  setTab('join')
                  setLocalError(null)
                  clearError()
                }}
                className={`px-4 py-2 font-medium text-sm border-b-2 ${
                  tab === 'join'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Unirse con Código
              </button>
            </div>

            {tab === 'create' ? (
              <form onSubmit={handleCreateOrg} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de la Inmobiliaria *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: Realty Experts"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ej: Madrid"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Región</label>
                    <input
                      type="text"
                      name="region"
                      value={formData.region}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ej: Madrid"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="info@inmobiliaria.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+34 91 234 5678"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !formData.name}
                  className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                  {isLoading ? 'Creando...' : 'Crear Inmobiliaria'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleAcceptInvite} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código de Invitación
                  </label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="Pega el código que recibiste"
                  />
                </div>

                <p className="text-sm text-gray-600">
                  El código te fue enviado por el administrador de tu inmobiliaria
                </p>

                <button
                  type="submit"
                  disabled={isLoading || !inviteCode.trim()}
                  className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                  {isLoading ? 'Aceptando...' : 'Aceptar Invitación'}
                </button>
              </form>
            )}
          </div>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          ← Volver al Dashboard
        </button>
      </div>
    </div>
  )
}
