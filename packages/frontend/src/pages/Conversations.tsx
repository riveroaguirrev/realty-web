import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
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
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <h1 className="text-2xl font-bold text-gray-900">Realty</h1>
              <div className="flex gap-4">
                <button
                  onClick={() => navigate('/search')}
                  className="text-gray-600 hover:text-gray-900"
                >
                  Búsqueda
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="text-gray-600 hover:text-gray-900"
                >
                  ← Dashboard
                </button>
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Conversaciones</h2>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {conversations.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-600 text-lg mb-4">No tienes conversaciones aún</p>
              <button
                onClick={() => navigate('/search')}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
              >
                Buscar asesores
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden divide-y divide-gray-200">
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
