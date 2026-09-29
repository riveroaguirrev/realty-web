import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/hooks/useOrganization'

export const InviteAccept = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { accessToken } = useAuth()
  const { acceptInvite, error } = useOrganization()

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [orgName, setOrgName] = useState('')

  const inviteCode = searchParams.get('code')

  useEffect(() => {
    if (!accessToken) {
      navigate('/auth/login')
      return
    }

    if (!inviteCode) {
      setStatus('error')
      return
    }

    const acceptInvitation = async () => {
      try {
        const result = await acceptInvite(inviteCode)
        setOrgName(result.organizationName || 'Inmobiliaria')
        setStatus('success')
        setTimeout(() => {
          navigate('/organization/dashboard')
        }, 2000)
      } catch (err) {
        setStatus('error')
      }
    }

    acceptInvitation()
  }, [inviteCode, accessToken])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Realty</h1>

          {status === 'loading' && (
            <>
              <div className="my-8">
                <div className="inline-block">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Procesando invitación...</h2>
              <p className="text-gray-600">Por favor espera</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="my-8">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                  <svg
                    className="h-8 w-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">¡Invitación aceptada!</h2>
              <p className="text-gray-600 mb-4">
                Te has unido a <strong>{orgName}</strong>
              </p>
              <p className="text-sm text-gray-500">Redirigiendo al dashboard...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="my-8">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
                  <svg
                    className="h-8 w-8 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Código inválido</h2>
              <p className="text-gray-600 mb-6">
                {error || 'El código de invitación no es válido, expiró o ya fue utilizado.'}
              </p>
              <button
                onClick={() => navigate('/organization/setup')}
                className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 font-medium"
              >
                Ir a Configuración
              </button>
            </>
          )}
        </div>

        <p className="text-center text-gray-600 text-sm mt-4">
          {status === 'loading' ? 'No cierres esta página' : '© 2026 Realty Platform'}
        </p>
      </div>
    </div>
  )
}
