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
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <nav className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Realty</h1>
                <p className="text-sm text-gray-600">
                  {otherAdvisor?.firstName} {otherAdvisor?.lastName}
                </p>
              </div>
              <button
                onClick={() => navigate('/messages')}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Conversaciones
              </button>
            </div>
          </div>
        </nav>

        <div className="flex-1 max-w-3xl mx-auto w-full bg-white shadow-lg flex flex-col">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                <p>Inicia una conversación</p>
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
          <div className="border-t border-gray-200 p-4">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Escribe un mensaje..."
                disabled={sending}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || sending}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {sending ? '...' : 'Enviar'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
