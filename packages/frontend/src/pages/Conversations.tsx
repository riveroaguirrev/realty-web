import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useRealtimeConversations } from '@/hooks/useRealtimeConversations'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { conversationsAPI } from '@/services/conversations'

export const Conversations = () => {
  const navigate = useNavigate()
  const { accessToken } = useAuth()

  const [conversations, setConversations] = useState<any[]>([])
  const [pagination, setPagination] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken) return
    loadConversations()

    // Subscribe to real-time updates
    const subscription = useRealtimeConversations({
      advisorId: accessToken,
      onConversationUpdated: (updatedConv) => {
        setConversations((prev) =>
          prev.map((c) => (c.id === updatedConv.id ? updatedConv : c))
        )
      },
      onNewMessage: (newMessage) => {
        // Move conversation with new message to top of list
        setConversations((prev) => {
          const updated = prev.map((c) =>
            c.id === newMessage.conversationId
              ? { ...c, lastMessageAt: newMessage.createdAt }
              : c
          )
          return updated.sort(
            (a, b) =>
              new Date(b.lastMessageAt || 0).getTime() -
              new Date(a.lastMessageAt || 0).getTime()
          )
        })
      },
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [accessToken])

  const loadConversations = async (page = 1) => {
    if (!accessToken) return

    try {
      setIsLoading(true)
      setError(null)
      const result = await conversationsAPI.list(accessToken, page, 20)
      setConversations(result.conversations)
      setPagination(result.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations')
    } finally {
      setIsLoading(false)
    }
  }

  const getOtherParticipant = (conv: any) => {
    const current = useAuth()
    return conv.participants?.find((p: any) => p.advisorId !== current.user?.id)
  }

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
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Cargando conversaciones...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-100">
        <nav className="bg-white shadow-md sticky top-0 z-50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                Realty
              </h1>
              <div className="flex gap-6">
                <button
                  onClick={() => navigate('/search')}
                  className="px-4 py-2 text-gray-700 hover:text-blue-600 font-semibold transition-colors"
                >
                  🔍 Búsqueda
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-4 py-2 text-gray-700 hover:text-blue-600 font-semibold transition-colors"
                >
                  ← Dashboard
                </button>
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-4xl font-bold text-gray-900 mb-2">💬 Conversaciones</h2>
            <p className="text-gray-600">Chat con otros asesores</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-r-lg shadow-sm">
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {conversations.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-16 text-center">
              <div className="text-6xl mb-4">🗨️</div>
              <p className="text-gray-600 text-lg mb-2">Sin conversaciones aún</p>
              <p className="text-gray-500 text-sm mb-6">Comienza a charlar con otros asesores</p>
              <button
                onClick={() => navigate('/search')}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-shadow"
              >
                🔍 Encontrar Asesores
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden divide-y divide-gray-200">
              {conversations.map((conv) => {
                const otherParticipant = getOtherParticipant(conv)
                const lastMsg = conv.messages?.[0]

                return (
                  <div
                    key={conv.id}
                    onClick={() => navigate(`/messages/${conv.id}`)}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {otherParticipant?.advisor?.firstName}{' '}
                          {otherParticipant?.advisor?.lastName}
                        </h3>
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
                  </div>
                )
              })}
            </div>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => loadConversations(page)}
                  disabled={isLoading}
                  className={`px-4 py-2 rounded ${
                    page === pagination.page
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  } disabled:opacity-50`}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
