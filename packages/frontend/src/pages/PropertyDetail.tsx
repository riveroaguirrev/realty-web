import './PropertyDetail.css'
import { PropertyLocationMap } from '@/components/map/PropertyLocationMap'
import { formatPrice, PROPERTY_TYPES } from '@/utils/propertyPresentation'
import { Icon } from '@/components/ui/Icon'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { User } from '@shared/types'
import { useAuth } from '@/hooks/useAuth'
import { propertyAPI } from '@/services/property'
import { favoritesAPI } from '@/services/favorites'
import { conversationsAPI } from '@/services/conversations'
import { canManageProperty } from '@/utils/propertyPermissions'
import { PropertyFullDetails } from '@/components/property/PropertyFullDetails'
import { SimilarProperties } from '@/components/property/SimilarProperties'
import { WhatsAppContact } from '@/components/ui/WhatsAppContact'
import { PROPERTY_OPERATIONS, propertyOperation } from '@/utils/propertyOperations'
import { authSessionIdentity } from '@/utils/sessionIdentity'

export const PropertyDetail = () => {
  const { id } = useParams<{ id: string }>()
  const { accessToken, user } = useAuth()
  if (!id || !accessToken) return null
  const session = authSessionIdentity(accessToken) ?? accessToken
  return <PropertyDetailView key={`${session}:${id}`} id={id} user={user} accessToken={accessToken} session={session} />
}

function PropertyDetailView({ id, accessToken, user, session }: { id: string; accessToken: string; user: User | null; session: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedImage, setSelectedImage] = useState(0)
  const propertyQuery = useQuery({
    queryKey: ['property-detail', session, id],
    queryFn: ({ signal }) => propertyAPI.get(accessToken, id, signal),
    retry: false,
  })
  const favoriteKey = ['property-favorite', session, id]
  const favoriteQuery = useQuery({
    queryKey: favoriteKey,
    queryFn: ({ signal }) => favoritesAPI.isFavorite(accessToken, id, signal),
    retry: false,
  })
  const favorite = useMutation({
    mutationFn: async (save: boolean) => {
      await queryClient.cancelQueries({ queryKey: favoriteKey })
      if (save) await favoritesAPI.add(accessToken, id)
      else await favoritesAPI.remove(accessToken, id)
    },
    onSuccess: (_, saved) => queryClient.setQueryData(favoriteKey, saved),
  })
  const contact = useMutation({ mutationFn: (advisorId: string) => conversationsAPI.create(accessToken, [advisorId]) })
  const property = propertyQuery.data
  const isFavorite = favoriteQuery.data ?? false

  if (propertyQuery.isPending) {
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

  if (propertyQuery.isError || !property) {
    return (
      <>
        <div className="page-surface flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600 mb-4">{propertyQuery.error?.message || 'Propiedad no encontrada'}</p>
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

        <div className={`page-content property-detail-page property-detail-${String(property.operation || 'SALE').toLowerCase()}`}>
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
              <div className="bg-white rounded-xl shadow-lg p-8 mb-6 pd-information">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">{property.title}</h1>
                <p className="text-lg text-gray-600 mb-6">{property.city}, {property.region}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 p-6 rounded-lg pd-highlights">
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
                    {property.locationMode === 'EXACT' && property.isExclusive ? property.address : 'Zona aproximada'}
                    <br />
                    {property.city}, {property.region}
                  </p>
                </div>

                {property.latitude != null && property.longitude != null && <PropertyLocationMap operation={property.operation} value={{ latitude: property.latitude, longitude: property.longitude, locationMode: property.isExclusive && property.locationMode === 'EXACT' ? 'EXACT' : 'RADIUS', locationRadiusMeters: property.locationRadiusMeters ?? 500 }} />}

                <div className="pt-6 pd-price-section">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Operación</p>
                  <p className="text-lg font-bold text-gray-900 mb-4">{property.operation === 'RENTAL' ? 'Alquiler' : property.operation === 'ANTICRETIC' ? 'Anticrético' : 'Venta'}</p>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Precio</p>
                  <p className="text-4xl font-bold pd-price">
                    {formatPrice(property.price, property.currency)}
                  </p>
                  {(property.operation === 'RENTAL' || property.operation === 'ANTICRETIC') && <div className="property-conditions mt-5"><span>{property.furnished && property.furnished !== 'UNFURNISHED' ? 'Amoblado' : 'Sin amoblar'}</span><span>{property.petsAllowed ? 'Mascotas permitidas' : 'Sin mascotas'}</span><span>{property.expensesIncluded ? 'Expensas incluidas' : 'Expensas aparte'}</span><span>{property.wifiIncluded ? 'Wifi incluido' : 'Wifi aparte'}</span>{property.commissionPercentage > 0 && <span>Comisión: {property.commissionPercentage}%</span>}</div>}
                </div>
                <PropertyFullDetails property={property} canManage={canManageProperty(user, property)} />
              </div>
            </div>

            {/* Advisor Info Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg p-8 sticky top-20 pd-advisor">
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
                  {contact.isError && <p role="alert" className="form-error">No pudimos iniciar la conversación. Inténtalo de nuevo.</p>}
                  {property.advisor && property.advisor.id !== user?.id && <>
                    {property.status !== 'ARCHIVED' && <WhatsAppContact phone={property.advisor.whatsappPhone} recipient={property.advisor.firstName}
                      context={{ kind: 'property', title: property.title, city: property.city, operation: PROPERTY_OPERATIONS[propertyOperation(property.operation)].label, url: new URL(`/properties/${encodeURIComponent(property.id)}`, window.location.origin).href }} className="w-full" />}
                    <button
                      onClick={() => contact.mutate(property.advisor.id, { onSuccess: conversation => navigate(`/messages/${conversation.id}`) })}
                      disabled={contact.isPending}
                      className="button button-primary w-full"
                    >
                      <Icon name="message" />{contact.isPending ? 'Abriendo conversación…' : 'Contactar al asesor'}
                    </button>
                  </>}
                  {favorite.isError && <p role="alert" className="form-error">No pudimos actualizar tus favoritos. Inténtalo de nuevo.</p>}
                  {favoriteQuery.isError ? <button type="button" className="button button-secondary w-full" onClick={() => void favoriteQuery.refetch()} disabled={favoriteQuery.isFetching}>Reintentar cargar favorito</button> : <button
                    aria-pressed={isFavorite}
                    onClick={() => favorite.mutate(!isFavorite)}
                    disabled={favoriteQuery.isPending || favorite.isPending}
                    className="pd-favorite w-full py-3 px-4 rounded-lg font-semibold transition-all disabled:opacity-50"
                  >
                    {favoriteQuery.isPending || favorite.isPending ? 'Cargando favorito…' : isFavorite ? 'Guardado en favoritos' : 'Guardar en favoritos'}
                  </button>}

                  {canManageProperty(user, property) && (
                    <button
                      onClick={() => navigate(`/properties/${property.id}/edit`)}
                      className="w-full py-3 px-4 border-2 border-blue-600 text-blue-700 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                    >
                      Editar propiedad
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
