import { Link } from 'react-router-dom'
import { Pagination } from '@/components/ui/Pagination'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useRealtimeInbox } from '@/hooks/useRealtimeInbox'
import { UnreadBadge } from '@/components/notifications/UnreadBadge'
import { conversationsAPI } from '@/services/conversations'

export const Conversations = () => {
  const navigate = useNavigate()
  const { accessToken, user } = useAuth()

  const [conversations, setConversations] = useState<any[]>([])
  const [pagination, setPagination] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken) return
    loadConversations()
  }, [accessToken])

  useRealtimeInbox({
    accessToken,
    onNewMessage: () => {
      loadConversations(pagination?.page ?? 1, { showSpinner: false })
    },
  })

  const loadConversations = async (page = 1, { showSpinner = true } = {}) => {
    if (!accessToken) return

    try {
      if (showSpinner) setIsLoading(true)
      setError(null)
      const result = await conversationsAPI.list(accessToken, page, 20)
      setConversations(result.conversations)
      setPagination(result.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos cargar tus conversaciones.')
    } finally {
      setIsLoading(false)
    }
  }

  const getOtherParticipant = (conv: any) =>
    conv.participants?.find((p: any) => p.advisorId !== user?.id)

  const formatTime = (date: string) => {
    const d = new Date(date)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (d.toDateString() === today.toDateString()) {
      return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    } else if (d.toDateString() === yesterday.toDateString()) {
      return 'Ayer'
    } else {
      return d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
    }
  }

  if (isLoading) {
    return (
      <>
        <div className="page-surface flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Cargando conversaciones...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="page-surface">

        <div className="page-content">
          <div className="page-heading"><div><p className="eyebrow">CONEXIONES QUE ABREN PUERTAS</p>
            <h2 className="text-4xl font-bold text-gray-900 mb-2">Mensajes</h2>
            <p className="text-gray-600">Todas tus conversaciones con asesores, en un solo lugar.</p></div>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-r-lg shadow-sm">
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {error ? <button className="button button-secondary" onClick={() => loadConversations()}>Reintentar</button> : conversations.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-16 text-center">
              <div className="text-6xl mb-4">🗨️</div>
              <p className="text-gray-600 text-lg mb-2">Sin conversaciones aún</p>
              <p className="text-gray-500 text-sm mb-6">Abre una propiedad y pulsa “Contactar al asesor” para iniciar una conversación.</p>
              <button
                onClick={() => navigate('/search')}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-shadow"
              >
                Explorar propiedades
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden divide-y divide-gray-200">
              {conversations.map((conv) => {
                const otherParticipant = getOtherParticipant(conv)
                const lastMsg = conv.messages?.[0]

                return (
                  <Link
                    key={conv.id}
                    to={`/messages/${conv.id}`}
                    className="block p-6 hover:bg-gray-50 cursor-pointer transition relative"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">
                            {otherParticipant?.advisor?.firstName}{' '}
                            {otherParticipant?.advisor?.lastName}
                          </h3>
                          <UnreadBadge count={conv.unreadCount} />
                        </div>
                        <p className="text-sm text-gray-500">
                          {otherParticipant?.advisor?.organization?.name}
                        </p>
                        {lastMsg && (
                          <p className="text-sm text-gray-600 mt-2 truncate">
                            {lastMsg.sender?.firstName}: {lastMsg.content}
                          </p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-xs text-gray-500">
                          {conv.lastMessageAt && formatTime(conv.lastMessageAt)}
                        </p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          <Pagination page={pagination?.page || 1} totalPages={Math.ceil((pagination?.total || 0) / (pagination?.pageSize || 20))} onChange={loadConversations} disabled={isLoading} />
        </div>
      </div>
    </>
  )
}
