import { Fragment, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages'
import { conversationsAPI } from '@/services/conversations'
import { messagesAPI } from '@/services/messages'
import { Icon } from '@/components/ui/Icon'
import { ConversationArtwork, ConversationAvatar, conversationContact, conversationTitle } from '@/components/messages/ConversationIdentity'
import { getErrorMessage } from '@/utils/errorMessage'
import { DraftAttachment, MessageAttachmentCard } from '@/components/messages/MessageAttachments'
import { MESSAGE_FILE_ACCEPT, messageFilesError } from '@shared/messageAttachments'

export const ConversationDetail = ({ conversationId, onRead }: { conversationId: string; onRead: (id: string) => void }) => {
  const { accessToken, user } = useAuth()
  const client = useQueryClient()
  const [inputValue, setInputValue] = useState('')
  const [readError, setReadError] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [fileError, setFileError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<HTMLDivElement>(null)
  const nearBottom = useRef(true)
  const query = useQuery({
    queryKey: ['conversation', accessToken, conversationId], enabled: !!accessToken,
    queryFn: async () => {
      const [conversation, result] = await Promise.all([
        conversationsAPI.get(accessToken!, conversationId), messagesAPI.list(accessToken!, conversationId, 1, 50),
      ])
      if (!conversation) throw new Error('No encontramos esta conversación.')
      return { conversation, messages: result.messages }
    },
  })
  useRealtimeMessages({ conversationId, accessToken, onChange: () => { void query.refetch() } })

  useEffect(() => {
    if (!query.data || !accessToken) return
    let current = true
    conversationsAPI.markAsRead(accessToken, conversationId).then(() => {
      if (current) { setReadError(''); onRead(conversationId) }
    }).catch(() => { if (current) setReadError('No pudimos actualizar el estado de lectura.') })
    return () => { current = false }
  }, [accessToken, conversationId, query.dataUpdatedAt, onRead])

  useEffect(() => {
    const stream = streamRef.current
    if (stream && nearBottom.current) stream.scrollTop = stream.scrollHeight
  }, [query.data?.messages])

  const refresh = async () => {
    await Promise.all([query.refetch(), client.invalidateQueries({ queryKey: ['conversations', accessToken] })])
  }
  const send = useMutation({
    mutationFn: ({ content, attachments }: { content: string; attachments: File[] }) => messagesAPI.send(accessToken!, conversationId, content, attachments),
    onSuccess: async () => { setInputValue(''); setFiles([]); setFileError(''); nearBottom.current = true; await refresh() },
  })
  const remove = useMutation({ mutationFn: (messageId: string) => messagesAPI.delete(accessToken!, conversationId, messageId), onSuccess: refresh })

  const back = <Link to="/messages" className="conversation-back icon-button" aria-label="Volver a conversaciones"><Icon name="back" /></Link>
  if (query.isPending) return <section className="conversation-pane"><header className="conversation-header">{back}<p role="status">Cargando conversación…</p></header><div className="conversation-loading" role="status"><Icon name="message" width="34" height="34" /><p>Preparando tus mensajes…</p></div></section>
  if (!query.data) return <section className="conversation-pane"><header className="conversation-header">{back}<h2>Conversación</h2></header><div className="conversation-loading" role="alert"><p>{getErrorMessage(query.error, 'No pudimos cargar la conversación.')}</p><button className="button button-secondary" onClick={() => query.refetch()}>Reintentar</button></div></section>

  const { conversation, messages } = query.data
  const contact = conversationContact(conversation, user?.id)
  const title = conversationTitle(conversation, user?.id)
  const actionError = send.error || remove.error || query.error
  const time = (value: string) => new Date(value).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })

  return <section className="conversation-pane" aria-label={`Conversación con ${title}`}>
    <header className="conversation-header">{back}<ConversationAvatar advisor={contact} title={title} /><div><h2>{title}</h2><p>{contact?.organization?.name || 'Asesor inmobiliario'}</p></div></header>
    {(actionError || readError) && <div className="conversation-error" role="alert"><p>{actionError ? getErrorMessage(actionError, 'No pudimos completar la acción. Inténtalo de nuevo.') : readError}</p><button type="button" onClick={() => { send.reset(); remove.reset(); void query.refetch() }}>Reintentar</button></div>}
    <div className="conversation-stream" ref={streamRef} role="log" aria-label="Mensajes de la conversación" aria-live="polite" aria-relevant="additions text" onScroll={event => { const stream = event.currentTarget; nearBottom.current = stream.scrollHeight - stream.scrollTop - stream.clientHeight < 100 }}>
      {messages.map((message, index) => {
        const own = message.senderId === user?.id
        const newDay = index === 0 || new Date(messages[index - 1].createdAt).toDateString() !== new Date(message.createdAt).toDateString()
        return <Fragment key={message.id}>
          {newDay && <div className="conversation-date"><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleDateString('es-BO', { day: 'numeric', month: 'long', ...(new Date(message.createdAt).getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) })}</time></div>}
          <div className={`conversation-message ${own ? 'is-own' : ''}`}>
            <div className="message-bubble">
              {!own && conversation.type === 'GROUP' && <strong className="message-author">{message.sender?.firstName} {message.sender?.lastName}</strong>}
              {message.content && <p>{message.content}</p>}
              {!!message.attachments?.length && accessToken && <div className="message-attachments">{message.attachments.map(file => <MessageAttachmentCard key={file.id} file={file} token={accessToken} conversationId={conversationId} messageId={message.id} />)}</div>}
              <div className="message-meta"><time dateTime={message.createdAt}>{time(message.createdAt)}{message.editedAt && ' · editado'}</time>{own && <><span className="message-sent" aria-label="Enviado" title="Enviado"><Icon name="check" width="14" height="14" /></span><button type="button" className="message-delete" aria-label="Eliminar mensaje" title="Eliminar mensaje" disabled={remove.isPending} onClick={() => { if (window.confirm('¿Eliminar mensaje?')) remove.mutate(message.id) }}><Icon name="trash" width="13" height="13" /></button></>}</div>
            </div>
          </div>
        </Fragment>
      })}
      {messages.length <= 3 && <div className="conversation-inspiration"><ConversationArtwork /><p>{messages.length ? 'Cada conversación abre una oportunidad.' : 'Envía el primer mensaje y abre una nueva oportunidad.'}</p></div>}
    </div>
    <form className="conversation-composer" aria-label="Enviar mensaje" onSubmit={event => {
      event.preventDefault()
      if ((inputValue.trim() || files.length) && !send.isPending && accessToken) send.mutate({ content: inputValue.trim(), attachments: files })
    }}>
      {!!files.length && <div className="conversation-draft-attachments" aria-label="Archivos para enviar">{files.map((file, index) => <DraftAttachment key={`${index}:${file.name}:${file.lastModified}`} file={file} disabled={send.isPending} onRemove={() => { setFiles(current => current.filter((_, item) => item !== index)); setFileError('') }} />)}</div>}
      {fileError && <p className="attachment-error" role="alert">{fileError}</p>}
      <div className="conversation-composer-row">
        <input ref={fileInputRef} className="conversation-file-input" type="file" multiple accept={MESSAGE_FILE_ACCEPT} aria-label="Seleccionar fotos o documentos" disabled={send.isPending} onChange={event => {
          const next = [...files, ...Array.from(event.target.files || [])]
          const error = messageFilesError(next)
          setFileError(error || '')
          if (!error) { setFiles(next); send.reset() }
          event.target.value = ''
        }} />
        <button type="button" className="conversation-attach" aria-label="Adjuntar fotos o documentos" title="Adjuntar fotos o documentos" disabled={send.isPending} onClick={() => fileInputRef.current?.click()}><Icon name="attach" /></button>
        <input type="text" aria-label="Escribe un mensaje" placeholder="Escribe un mensaje…" maxLength={10000} value={inputValue} onChange={event => setInputValue(event.target.value)} disabled={send.isPending} autoComplete="off" />
        <button type="submit" aria-label={send.isPending ? 'Enviando mensaje' : 'Enviar mensaje'} title="Enviar mensaje" disabled={(!inputValue.trim() && !files.length) || send.isPending}><Icon name="send" /></button>
      </div>
      <p className="attachment-hint" role={send.isPending ? 'status' : undefined}>{send.isPending ? 'Enviando…' : 'Fotos y documentos · hasta 5 archivos y 3 MB en total'}</p>
    </form>
  </section>
}
