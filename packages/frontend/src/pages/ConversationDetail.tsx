import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages'
import { conversationsAPI } from '@/services/conversations'
import { messagesAPI } from '@/services/messages'
import { Icon } from '@/components/ui/Icon'
import { ConversationArtwork, ConversationAvatar, conversationContact, conversationTitle } from '@/components/messages/ConversationIdentity'
import { getErrorMessage } from '@/utils/errorMessage'
import { authSessionIdentity } from '@/utils/sessionIdentity'
import { DraftAttachment, MessageAttachmentCard } from '@/components/messages/MessageAttachments'
import { MessageCopyButton } from '@/components/messages/MessageCopyButton'
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
  const composerInput = useRef<HTMLInputElement>(null)
  const prependAnchor = useRef<{ height: number; top: number } | null>(null)
  const [showJump, setShowJump] = useState(false)
  const [draggingFiles, setDraggingFiles] = useState(false)
  const dragDepth = useRef(0)
  const nearBottom = useRef(true)
  const session = accessToken && (authSessionIdentity(accessToken) ?? accessToken)
  const historyKey = ['conversation-history', conversationId, session]
  const query = useQuery({
    queryKey: ['conversation', conversationId, session],
    queryFn: () => conversationsAPI.get(accessToken!, conversationId),
    enabled: !!accessToken,
  })
  const refreshHistory = () => client.invalidateQueries({ queryKey: historyKey, exact: true })
  const isLive = useRealtimeMessages({
    conversationId: query.data ? conversationId : undefined,
    accessToken,
    onChange: () => { void refreshHistory() },
    includesMessage: (messageId) => history.data?.pages.some(page => page.messages.some(message => message.id === messageId)) ?? false,
  })
  const history = useInfiniteQuery({
    queryKey: historyKey,
    queryFn: ({ pageParam, signal }) => messagesAPI.listRecent(accessToken!, conversationId, pageParam, signal),
    enabled: !!accessToken && !!query.data,
    initialPageParam: null as string | null,
    getNextPageParam: page => page.nextCursor,
    refetchInterval: isLive ? false : 3000,
  })
  const messages = history.data?.pages.flatMap(page => page.messages).reverse() ?? []
  const newestId = messages.at(-1)?.id
  const [readRetry, setReadRetry] = useState(0)

  useEffect(() => {
    if (!newestId || !accessToken) return
    let current = true
    conversationsAPI.markAsRead(accessToken, conversationId, newestId).then(() => {
      if (current) { setReadError(''); onRead(conversationId) }
    }).catch(() => { if (current) setReadError('No pudimos actualizar el estado de lectura.') })
    return () => { current = false }
  }, [accessToken, conversationId, newestId, onRead, readRetry])

  useLayoutEffect(() => {
    const stream = streamRef.current
    if (stream && prependAnchor.current) {
      stream.scrollTop = stream.scrollHeight - prependAnchor.current.height + prependAnchor.current.top
      prependAnchor.current = null
    } else if (stream && nearBottom.current) {
      stream.scrollTop = stream.scrollHeight
      setShowJump(false)
    }
  }, [newestId, history.data?.pages.length])

  const refresh = async () => {
    await Promise.all([refreshHistory(), client.invalidateQueries({ queryKey: ['conversations', accessToken] })])
  }
  const send = useMutation({
    mutationFn: ({ content, attachments }: { content: string; attachments: File[] }) => messagesAPI.send(accessToken!, conversationId, content, attachments),
    onSuccess: async () => { setInputValue(''); setFiles([]); setFileError(''); nearBottom.current = true; await refresh() },
  })
  const remove = useMutation({ mutationFn: (messageId: string) => messagesAPI.delete(accessToken!, conversationId, messageId), onSuccess: refresh })

  const wasSending = useRef(false)
  useEffect(() => {
    if (wasSending.current && !send.isPending) composerInput.current?.focus({ preventScroll: true })
    wasSending.current = send.isPending
  }, [send.isPending])
  const addFiles = (incoming: File[]) => {
    const next = [...files, ...incoming]
    const error = messageFilesError(next)
    setFileError(error || '')
    if (!error) { setFiles(next); send.reset() }
  }
  const jumpToLatest = () => {
    const stream = streamRef.current
    if (!stream) return
    nearBottom.current = true
    stream.scrollTo({ top: stream.scrollHeight, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    setShowJump(false)
  }
  const loadPrevious = async () => {
    if (history.isFetching) return
    const stream = streamRef.current
    if (stream) prependAnchor.current = { height: stream.scrollHeight, top: stream.scrollTop }
    nearBottom.current = false
    setShowJump(true)
    try {
      const result = await history.fetchNextPage({ cancelRefetch: false })
      if (result.isFetchNextPageError) prependAnchor.current = null
    } catch { prependAnchor.current = null }
  }

  const back = <Link to="/messages" className="conversation-back icon-button" aria-label="Volver a conversaciones"><Icon name="back" /></Link>
  if (query.isPending || history.isLoading) return <section className="conversation-pane"><header className="conversation-header">{back}<p role="status">Cargando conversación…</p></header><div className="conversation-loading" role="status"><Icon name="message" width="34" height="34" /><p>Preparando tus mensajes…</p></div></section>
  if (!query.data) return <section className="conversation-pane"><header className="conversation-header">{back}<h2>Conversación</h2></header><div className="conversation-loading" role="alert"><p>{getErrorMessage(query.error, 'No pudimos cargar la conversación.')}</p><button className="button button-secondary" onClick={() => query.refetch()}>Reintentar</button></div></section>

  const conversation = query.data
  const contact = conversationContact(conversation, user?.id)
  const title = conversationTitle(conversation, user?.id)
  const actionError = send.error || remove.error || query.error || (history.isFetchNextPageError ? null : history.error)
  const time = (value: string) => new Date(value).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })

  return <section className="conversation-pane" aria-label={`Conversación con ${title}`}>
    <header className="conversation-header">{back}<ConversationAvatar advisor={contact} title={title} /><div><h2>{title}</h2><p>{contact?.organization?.name || 'Asesor inmobiliario'}</p></div></header>
    {(actionError || readError) && <div className="conversation-error" role="alert"><p>{actionError ? getErrorMessage(actionError, 'No pudimos completar la acción. Inténtalo de nuevo.') : readError}</p><button type="button" onClick={() => { send.reset(); remove.reset(); void query.refetch(); void refreshHistory(); if (readError) setReadRetry(count => count + 1) }}>Reintentar</button></div>}
    <div className="conversation-thread">
    <div className="conversation-stream" ref={streamRef} role="log" aria-label="Mensajes de la conversación" aria-live="polite" aria-relevant="additions text" onScroll={event => { const stream = event.currentTarget; nearBottom.current = stream.scrollHeight - stream.scrollTop - stream.clientHeight < 100; setShowJump(!nearBottom.current) }}>
      {history.hasNextPage && (
        <button type="button" className="button button-secondary mx-auto" disabled={history.isFetching}
          onClick={() => { void loadPrevious() }}>
          {history.isFetchingNextPage ? 'Cargando mensajes…' : history.isFetchNextPageError ? 'Reintentar cargar mensajes anteriores' : 'Cargar mensajes anteriores'}
        </button>
      )}
      {messages.map((message, index) => {
        const own = message.senderId === user?.id
        const newDay = index === 0 || new Date(messages[index - 1].createdAt).toDateString() !== new Date(message.createdAt).toDateString()
        const continued = !newDay && messages[index - 1]?.senderId === message.senderId && new Date(message.createdAt).getTime() - new Date(messages[index - 1].createdAt).getTime() < 300000
        return <Fragment key={message.id}>
          {newDay && <div className="conversation-date"><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleDateString('es-BO', { day: 'numeric', month: 'long', ...(new Date(message.createdAt).getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) })}</time></div>}
          <div className={`conversation-message ${own ? 'is-own' : ''}${continued ? ' is-continuation' : ''}`}>
            <div className="message-bubble">
              {!own && conversation.type === 'GROUP' && <strong className="message-author">{message.sender?.firstName} {message.sender?.lastName}</strong>}
              {message.content && <p>{message.content}</p>}
              {!!message.attachments?.length && accessToken && <div className="message-attachments">{message.attachments.map(file => <MessageAttachmentCard key={file.id} file={file} token={accessToken} conversationId={conversationId} messageId={message.id} />)}</div>}
              <div className="message-meta"><time dateTime={message.createdAt}>{time(message.createdAt)}{message.editedAt && ' · editado'}</time>{own && <span className="message-sent" aria-label="Enviado" title="Enviado"><Icon name="check" width="14" height="14" /></span>}<span className="message-actions">{message.content && <MessageCopyButton content={message.content} />}{own && <button type="button" className="message-delete" aria-label="Eliminar mensaje" title="Eliminar mensaje" disabled={remove.isPending} onClick={() => { if (window.confirm('¿Eliminar mensaje?')) remove.mutate(message.id) }}><Icon name="trash" width="13" height="13" /></button>}</span></div>
            </div>
          </div>
        </Fragment>
      })}
      {messages.length === 0 && <div className="conversation-inspiration"><ConversationArtwork /><p>Inicia la conversación.</p></div>}
    </div>
    {showJump && <button type="button" className="conversation-jump" onClick={jumpToLatest}><Icon name="arrow" width="17" height="17" />Últimos mensajes</button>}
    </div>
    <form className={`conversation-composer${draggingFiles ? ' is-dragging-files' : ''}`} aria-label="Enviar mensaje"
      onDragEnter={event => { if (!send.isPending && event.dataTransfer.types.includes('Files')) { event.preventDefault(); dragDepth.current++; setDraggingFiles(true) } }}
      onDragOver={event => { if (event.dataTransfer.types.includes('Files')) event.preventDefault() }}
      onDragLeave={event => { if (event.dataTransfer.types.includes('Files')) { dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDraggingFiles(false) } }}
      onDrop={event => { if (!event.dataTransfer.types.includes('Files')) return; event.preventDefault(); dragDepth.current = 0; setDraggingFiles(false); if (!send.isPending) addFiles(Array.from(event.dataTransfer.files)) }}
      onSubmit={event => {
      event.preventDefault()
      if ((inputValue.trim() || files.length) && !send.isPending && accessToken) send.mutate({ content: inputValue.trim(), attachments: files })
    }}>
      {draggingFiles && <div className="conversation-drop-hint"><Icon name="attach" />Suelta las fotos o documentos</div>}
      {!!files.length && <div className="conversation-draft-attachments" aria-label="Archivos para enviar">{files.map((file, index) => <DraftAttachment key={`${index}:${file.name}:${file.lastModified}`} file={file} disabled={send.isPending} onRemove={() => { setFiles(current => current.filter((_, item) => item !== index)); setFileError('') }} />)}</div>}
      {fileError && <p className="attachment-error" role="alert">{fileError}</p>}
      <div className="conversation-composer-row">
        <input ref={fileInputRef} className="conversation-file-input" type="file" multiple accept={MESSAGE_FILE_ACCEPT} aria-label="Seleccionar fotos o documentos" disabled={send.isPending} onChange={event => {
          addFiles(Array.from(event.target.files || []))
          event.target.value = ''
        }} />
        <button type="button" className="conversation-attach" aria-label="Adjuntar fotos o documentos" title="Adjuntar fotos o documentos" disabled={send.isPending} onClick={() => fileInputRef.current?.click()}><Icon name="attach" /></button>
        <input ref={composerInput} type="text" aria-label="Escribe un mensaje" placeholder="Escribe un mensaje…" maxLength={10000} value={inputValue} onChange={event => setInputValue(event.target.value)} disabled={send.isPending} autoComplete="off" />
        <button type="submit" aria-label={send.isPending ? 'Enviando mensaje' : 'Enviar mensaje'} title="Enviar mensaje" disabled={(!inputValue.trim() && !files.length) || send.isPending}><Icon name="send" /></button>
      </div>
      <p className="attachment-hint" role={send.isPending ? 'status' : undefined}>{send.isPending ? 'Enviando…' : files.length ? `${files.length}/5 archivos · 3 MB máx. en total` : 'Fotos y documentos · 5 archivos · 3 MB máx. en total'}</p>
    </form>
  </section>
}
