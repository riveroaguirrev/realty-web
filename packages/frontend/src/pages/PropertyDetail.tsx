import { formatPrice, PROPERTY_TYPES } from '@/utils/propertyPresentation'
import { Icon } from '@/components/ui/Icon'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { propertyAPI } from '@/services/property'
import { favoritesAPI } from '@/services/favorites'
import { conversationsAPI } from '@/services/conversations'
import { canManageProperty } from '@/utils/propertyPermissions'
import { SimilarProperties } from '@/components/property/SimilarProperties'

export const PropertyDetail = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { accessToken, user } = useAuth()

  const [property, setProperty] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState(0)
  const [actionError, setActionError] = useState('')
  const [isFavorite, setIsFavorite] = useState(false)
  const [toggleFavLoading, setToggleFavLoading] = useState(false)
  const [contactLoading, setContactLoading] = useState(false)

  useEffect(() => {
    if (!id || !accessToken) return

    const loadProperty = async () => {
      try {
        setIsLoading(true)
        setError(null)
        setSelectedImage(0)
        const [prop, favorite] = await Promise.all([
          propertyAPI.get(accessToken, id),
          favoritesAPI.isFavorite(accessToken, id),
        ])
        setProperty(prop)
        setIsFavorite(favorite)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No pudimos cargar la propiedad')
      } finally {
        setIsLoading(false)
      }
    }

    loadProperty()
  }, [id, accessToken])

  const handleToggleFavorite = async () => {
    if (!accessToken || !property) return

    try {
      setToggleFavLoading(true)
      setActionError('')
      if (isFavorite) {
        await favoritesAPI.remove(accessToken, property.id)
        setIsFavorite(false)
      } else {
        await favoritesAPI.add(accessToken, property.id)
        setIsFavorite(true)
      }
    } catch (err) {
      setActionError('No pudimos actualizar tus favoritos. Inténtalo de nuevo.')
    } finally {
      setToggleFavLoading(false)
    }
  }

  const handleContactAdvisor = async () => {
    if (!accessToken || !property?.advisor) return

    try {
      setContactLoading(true)
      setActionError('')
      const conversation = await conversationsAPI.create(accessToken, [property.advisor.id])
      navigate(`/messages/${conversation.id}`)
    } catch (err) {
      setActionError('No pudimos iniciar la conversación. Inténtalo de nuevo.')
    } finally {
      setContactLoading(false)
    }
  }

  if (isLoading) {
    return (
      <>
        <div className="page-surface flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Cargando propiedad...</p>
          </div>
        </div>
      </>
    )
  }

  if (error || !property) {
    return (
      <>
        <div className="page-surface flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600 mb-4">{error || 'Propiedad no encontrada'}</p>
            <button
              onClick={() => navigate('/search')}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
              Volver a Búsqueda
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
          <button onClick={() => navigate(-1)} className="text-link mb-4">← Volver</button>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <div className="mb-6">
                {property.images?.length > 0 ? <>
                  <img src={property.images[selectedImage]} alt={`${property.title}, fotografía ${selectedImage+1}`} className="gallery-main" />
                  {property.images.length > 1 && <div className="gallery-thumbs" aria-label="Fotografías de la propiedad">{property.images.map((img: string,index: number) => <button key={index} aria-label={`Ver fotografía ${index+1}`} aria-pressed={selectedImage===index} onClick={() => setSelectedImage(index)}><img src={img} alt="" /></button>)}</div>}
                </> : <div className="property-placeholder rounded-xl" style={{ minHeight: 230 }}><Icon name="home" width="42" height="42" /><span>Esta propiedad aún no tiene fotografías</span></div>}
              </div>

              {/* Details */}
              <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">{property.title}</h1>
                <p className="text-lg text-gray-600 mb-6">{property.city}, {property.region}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 p-6 bg-gradient-to-r from-blue-50 to-slate-50 rounded-lg">
                  {property.bedrooms != null && (
                    <div className="text-center">
                      <p className="text-4xl font-bold text-blue-600 mb-1">{property.bedrooms}</p>
                      <p className="text-xs font-semibold text-gray-600 uppercase">Dormitorios</p>
                    </div>
                  )}
                  {property.bathrooms != null && (
                    <div className="text-center">
                      <p className="text-4xl font-bold text-blue-600 mb-1">{property.bathrooms}</p>
                      <p className="text-xs font-semibold text-gray-600 uppercase">Baños</p>
                    </div>
                  )}
                  {property.areaSquareMeters && (
                    <div className="text-center">
                      <p className="text-4xl font-bold text-blue-600 mb-1">{property.areaSquareMeters}</p>
                      <p className="text-xs font-semibold text-gray-600 uppercase">m²</p>
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600 mb-1"><Icon name="home" className="mx-auto" /></p>
                    <p className="text-xs font-semibold text-gray-600 uppercase">{PROPERTY_TYPES[property.type] || property.type}</p>
                  </div>
                </div>

                {property.description && (
                  <div className="mb-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-2">Descripción</h2>
                    <p className="text-gray-700">{property.description}</p>
                  </div>
                )}

                <div className="mb-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-2">Ubicación</h2>
                  <p className="text-gray-700">
                    {property.address}
                    <br />
                    {property.city}, {property.region}
                  </p>
                </div>

                <div className="border-t-2 border-blue-200 pt-6">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Precio</p>
                  <p className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                    {formatPrice(property.price, property.currency)}
                  </p>
                </div>
              </div>
            </div>

            {/* Advisor Info Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg p-8 sticky top-20">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b-2 border-blue-100">
                  Tu asesor
                </h2>

                {property.advisor && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Nombre</p>
                      <p className="text-gray-900 font-medium">
                        {property.advisor.firstName} {property.advisor.lastName}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-600">Email</p>
                      <a
                        href={`mailto:${property.advisor.email}`}
                        className="text-blue-600 hover:underline break-all"
                      >
                        {property.advisor.email}
                      </a>
                    </div>

                    {property.advisor.phone && (
                      <div>
                        <p className="text-sm font-medium text-gray-600">Teléfono</p>
                        <a
                          href={`tel:${property.advisor.phone}`}
                          className="text-blue-600 hover:underline"
                        >
                          {property.advisor.phone}
                        </a>
                      </div>
                    )}

                    {property.advisor.organization && (
                      <div>
                        <p className="text-sm font-medium text-gray-600">Inmobiliaria</p>
                        <p className="text-gray-900">{property.advisor.organization.name}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-8 space-y-3">
                  {actionError && <p role="alert" className="form-error">{actionError}</p>}
                  <button
                    aria-pressed={isFavorite}
                    onClick={handleToggleFavorite}
                    disabled={toggleFavLoading}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-all disabled:opacity-50 ${
                      isFavorite
                        ? 'bg-red-500 text-white hover:bg-red-600 shadow-md'
                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    }`}
                  >
                    {toggleFavLoading ? '...' : isFavorite ? 'Guardado en favoritos' : 'Guardar en favoritos'}
                  </button>

                  {canManageProperty(user, property) && (
                    <button
                      onClick={() => navigate(`/properties/${property.id}/edit`)}
                      className="w-full py-3 px-4 border-2 border-blue-600 text-blue-700 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                    >
                      Editar propiedad
                    </button>
                  )}

                  {property.advisor && property.advisor.id !== user?.id && (
                    <button
                      onClick={handleContactAdvisor}
                      disabled={contactLoading}
                      className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:shadow-lg transition-shadow disabled:opacity-50"
                    >
                      {contactLoading ? '...' : 'Contactar al asesor'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Similar Properties Section */}
          <div className="mt-12 col-span-1 lg:col-span-3">
            <SimilarProperties propertyId={property.id} />
          </div>
        </div>
      </div>
    </>
  )
}
