import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { conversationsAPI } from '@/services/conversations'
import { messagesAPI } from '@/services/messages'

export const ConversationDetail = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { accessToken, user } = useAuth()

  const [conversation, setConversation] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!id || !accessToken) return
    loadConversation()
  }, [id, accessToken])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadConversation = async () => {
    if (!id || !accessToken) return

    try {
      setIsLoading(true)
      setError(null)
      const conv = await conversationsAPI.get(accessToken, id)
      setConversation(conv)
      await conversationsAPI.markAsRead(accessToken, id)
      const result = await messagesAPI.list(accessToken, id, 1, 50)
      setMessages(result.messages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversation')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || !id || !accessToken) return

    try {
      setSending(true)
      const message = await messagesAPI.send(accessToken, id, inputValue.trim())
      setMessages([...messages, message])
      setInputValue('')
      await conversationsAPI.markAsRead(accessToken, id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    if (!id || !accessToken) return
    if (!window.confirm('¿Eliminar mensaje?')) return

    try {
      await messagesAPI.delete(accessToken, id, messageId)
      setMessages(messages.filter((m) => m.id !== messageId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete message')
    }
  }

  const getOtherParticipant = () => {
    return conversation?.participants?.find((p: any) => p.advisorId !== user?.id)?.advisor
  }

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Cargando conversación...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (!conversation) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Conversación no encontrada</p>
            <button
              onClick={() => navigate('/messages')}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
              Volver
            </button>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  const otherAdvisor = getOtherParticipant()

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex flex-col">
        <nav className="bg-white shadow-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  Realty
                </h1>
                <p className="text-sm text-blue-600 font-semibold">
                  💬 {otherAdvisor?.firstName} {otherAdvisor?.lastName}
                </p>
              </div>
              <button
                onClick={() => navigate('/messages')}
                className="px-4 py-2 text-gray-700 hover:text-blue-600 font-semibold transition-colors"
              >
                ← Conversaciones
              </button>
            </div>
          </div>
        </nav>

        <div className="flex-1 max-w-3xl mx-auto w-full bg-white shadow-xl flex flex-col rounded-xl">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-8 space-y-4">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-r-lg shadow-sm mb-4">
                <p className="font-medium">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            )}

            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-20">
                <p className="text-2xl mb-2">🗨️</p>
                <p className="text-lg">Inicia una conversación</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md ${
                      msg.senderId === user?.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    } rounded-lg px-4 py-2`}
                  >
                    {msg.senderId !== user?.id && (
                      <p className="text-xs font-medium mb-1">
                        {msg.sender?.firstName} {msg.sender?.lastName}
                      </p>
                    )}
                    <p className="break-words">{msg.content}</p>
                    <div className="flex justify-between items-center gap-2 mt-1">
                      <p className="text-xs opacity-70">
                        {new Date(msg.createdAt).toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {msg.editedAt && ' (editado)'}
                      </p>
                      {msg.senderId === user?.id && (
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="text-xs opacity-70 hover:opacity-100"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t-2 border-blue-100 p-6 bg-gradient-to-r from-blue-50 to-transparent">
            <form onSubmit={handleSendMessage} className="flex gap-3">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Escribe un mensaje..."
                disabled={sending}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 transition-all"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || sending}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg disabled:opacity-50 font-semibold transition-all"
              >
                {sending ? '...' : '📤 Enviar'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
