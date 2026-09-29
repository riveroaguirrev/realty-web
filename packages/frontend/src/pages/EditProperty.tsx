import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { EditableProperty, PropertyForm } from '@/components/property/PropertyForm'
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
      .catch((err) => setError(getErrorMessage(err, 'No pudimos cargar la propiedad')))
  }, [id, accessToken])

  const isAllowed = property ? canManageProperty(user, property) : false

  const renderContent = () => {
    if (error) return <p className="text-red-700">{error}</p>
    if (!property) return <p className="text-gray-600">Cargando propiedad…</p>
    if (!isAllowed) return <p className="text-red-700">No tienes permiso para editar esta propiedad.</p>
    if (!accessToken) return null

    return (
      <PropertyForm token={accessToken} property={property} onSubmit={() => navigate('/properties')} />
    )
  }

  return (
    <>
      <div className="page-surface">

        <div className="form-container">{renderContent()}</div>
      </div>
    </>
  )
}
