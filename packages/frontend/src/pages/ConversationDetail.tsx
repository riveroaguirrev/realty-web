import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages'
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

  useRealtimeMessages({
    conversationId: id,
    accessToken,
    onChange: () => refreshMessages(),
  })

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
      setError(err instanceof Error ? err.message : 'No pudimos cargar la conversación.')
    } finally {
      setIsLoading(false)
    }
  }

  const refreshMessages = async () => {
    if (!id || !accessToken) return

    try {
      const result = await messagesAPI.list(accessToken, id, 1, 50)
      setMessages(result.messages)
      await conversationsAPI.markAsRead(accessToken, id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos actualizar los mensajes.')
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || !id || !accessToken) return

    try {
      setSending(true)
      await messagesAPI.send(accessToken, id, inputValue.trim())
      setInputValue('')
      await refreshMessages()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos enviar el mensaje.')
    } finally {
      setSending(false)
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    if (!id || !accessToken) return
    if (!window.confirm('¿Eliminar mensaje?')) return

    try {
      await messagesAPI.delete(accessToken, id, messageId)
      await refreshMessages()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos eliminar el mensaje.')
    }
  }

  const getOtherParticipant = () => {
    return conversation?.participants?.find((p: any) => p.advisorId !== user?.id)?.advisor
  }

  if (isLoading) {
    return (
      <>
        <div className="page-surface flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Cargando conversación...</p>
          </div>
        </div>
      </>
    )
  }

  if (!conversation) {
    return (
      <>
        <div className="page-surface flex items-center justify-center">
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
      </>
    )
  }

  const otherAdvisor = getOtherParticipant()

  return (
    <>
      <div className="page-surface flex flex-col">

        <div className="page-heading"><div><p className="eyebrow">CONVERSACIÓN</p><h1>{otherAdvisor?.firstName} {otherAdvisor?.lastName}</h1><p>{otherAdvisor?.organization?.name || 'Asesor inmobiliario'}</p></div><button className="button button-secondary" onClick={() => navigate('/messages')}>Volver a mensajes</button></div>
        <div className="chat-panel flex-1 max-w-3xl mx-auto w-full bg-white shadow-xl flex flex-col rounded-xl">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-8 space-y-4" role="log" aria-label="Mensajes de la conversación" aria-live="polite">
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
                          aria-label="Eliminar mensaje"
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
                aria-label="Escribe un mensaje"
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
                {sending ? '...' : 'Enviar'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
