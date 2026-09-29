import { Permission } from '@shared/types'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/hooks/useOrganization'

export const OrganizationDashboard = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    organization,
    advisors,
    isLoading,
    error,
    getOrganization,
    listAdvisors,
    sendInvite,
    removeAdvisor,
  } = useOrganization()

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteSent, setInviteSent] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [removingAdvisor, setRemovingAdvisor] = useState<string | null>(null)

  const isAdmin = user?.permissions?.includes(Permission.ORG_ADMIN)

  useEffect(() => {
    if (user?.organizationId) {
      getOrganization(user.organizationId).catch(() => {})
      listAdvisors(user.organizationId).catch(() => {})
    }
  }, [user?.organizationId])

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!inviteEmail.trim() || !organization) {
      return
    }

    try {
      const result = await sendInvite(organization.id, inviteEmail)
      setInviteCode(result.inviteCode || '')
      setInviteEmail('')
      setInviteSent(true)
      setTimeout(() => setInviteSent(false), 5000)
    } catch (err) {
      console.error('Error sending invite:', err)
    }
  }

  const handleRemoveAdvisor = async (advisorId: string) => {
    if (!organization || !window.confirm('¿Estás seguro de que quieres remover este asesor?')) {
      return
    }

    setRemovingAdvisor(advisorId)
    try {
      await removeAdvisor(organization.id, advisorId)
    } catch (err) {
      console.error('Error removing advisor:', err)
    } finally {
      setRemovingAdvisor(null)
    }
  }

  if (isLoading && !organization) return <div className="loading-panel" role="status">Cargando tu inmobiliaria…</div>
  if (error && !organization) return <div className="empty-panel" role="alert"><h3>No pudimos cargar tu inmobiliaria</h3><p>{error}</p><button className="button button-secondary" onClick={() => user?.organizationId && getOrganization(user.organizationId).catch(() => {})}>Reintentar</button></div>
  if (!organization) {
    return (
      <>
        <div className="page-surface flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No hay organización</h2>
            <p className="text-gray-600 mb-6">
              Necesitas crear o unirte a una inmobiliaria para acceder al dashboard
            </p>
            <button
              onClick={() => navigate('/organization/setup')}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
              Ir a Configuración
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="page-surface">

        <div className="page-content">
          <div className="page-heading"><div><p className="eyebrow">MEJOR, EN EQUIPO</p><h1>{organization.name}</h1><p>La información y las personas de tu inmobiliaria.</p></div></div>
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Organization Info */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Información</h2>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Nombre</p>
                    <p className="text-gray-900">{organization.name}</p>
                  </div>

                  {organization.city && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">Ubicación</p>
                      <p className="text-gray-900">
                        {organization.city}
                        {organization.region && `, ${organization.region}`}
                      </p>
                    </div>
                  )}

                  {organization.email && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">Email</p>
                      <p className="text-gray-900">{organization.email}</p>
                    </div>
                  )}

                  {organization.phone && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">Teléfono</p>
                      <p className="text-gray-900">{organization.phone}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Tu Rol</p>
                    <p className="text-gray-900 capitalize">{user?.roleInOrganization}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Advisors List */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="text-lg font-bold text-gray-900">Miembros ({advisors.length})</h2>
                </div>

                {isAdmin && (
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <form onSubmit={handleSendInvite} className="flex gap-2">
                      <input
                        aria-label="Correo del nuevo asesor"
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="Email del nuevo asesor"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                      <button
                        type="submit"
                        disabled={!inviteEmail || isLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                      >
                        Invitar
                      </button>
                    </form>

                    {inviteSent && inviteCode && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                        <p className="text-blue-900 font-medium">Invitación enviada!</p>
                        <p className="text-blue-700 text-xs mt-1">
                          Código: <code className="bg-white px-2 py-1 rounded">{inviteCode}</code>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="divide-y divide-gray-200">
                  {advisors.length === 0 ? (
                    <div className="px-6 py-8 text-center text-gray-600">
                      No hay miembros en la organización
                    </div>
                  ) : (
                    advisors.map((advisor) => (
                      <div
                        key={advisor.id}
                        className="px-6 py-4 flex justify-between items-center hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-4">
                          {advisor.profileImage && (
                            <img
                              src={advisor.profileImage}
                              alt={advisor.firstName}
                              className="w-10 h-10 rounded-full"
                            />
                          )}
                          <div>
                            <p className="font-medium text-gray-900">
                              {advisor.firstName} {advisor.lastName}
                            </p>
                            <p className="text-sm text-gray-600">{advisor.email}</p>
                            <p className="text-xs text-gray-500 capitalize">{advisor.role}</p>
                          </div>
                        </div>

                        {isAdmin && advisor.id !== user?.id && advisor.role !== 'DIRECTOR' && (
                          <button
                            onClick={() => handleRemoveAdvisor(advisor.id)}
                            disabled={removingAdvisor === advisor.id}
                            className="px-3 py-1 text-red-600 hover:bg-red-50 rounded text-sm disabled:opacity-50"
                          >
                            {removingAdvisor === advisor.id ? 'Removiendo...' : 'Remover'}
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
