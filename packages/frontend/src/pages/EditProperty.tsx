import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { EditableProperty, PropertyForm } from '@/components/property/PropertyForm'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { propertyAPI } from '@/services/property'
import { canManageProperty } from '@/utils/propertyPermissions'
import { getErrorMessage } from '@/utils/errorMessage'

export const EditProperty = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { accessToken, user } = useAuth()

  const [property, setProperty] = useState<(EditableProperty & { advisorId: string; organizationId?: string | null }) | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id || !accessToken) return

    propertyAPI
      .get(accessToken, id)
      .then(setProperty)
      .catch((err) => setError(getErrorMessage(err, 'Failed to load property')))
  }, [id, accessToken])

  const isAllowed = property ? canManageProperty(user, property) : false

  const renderContent = () => {
    if (error) return <p className="text-red-700">{error}</p>
    if (!property) return <p className="text-gray-600">Loading property...</p>
    if (!isAllowed) return <p className="text-red-700">You do not have permission to edit this property.</p>
    if (!accessToken) return null

    return (
      <PropertyForm token={accessToken} property={property} onSubmit={() => navigate('/properties')} />
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <h1 className="text-2xl font-bold text-gray-900">Realty</h1>
              <button onClick={() => navigate('/properties')} className="text-gray-600 hover:text-gray-900">
                ← Back to Properties
              </button>
            </div>
          </div>
        </nav>

        <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">{renderContent()}</div>
      </div>
    </ProtectedRoute>
  )
}
