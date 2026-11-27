import { useCallback, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useRealtimeInbox } from '@/hooks/useRealtimeInbox'
import { conversationsAPI } from '@/services/conversations'
import { Icon } from '@/components/ui/Icon'
import { Pagination } from '@/components/ui/Pagination'
import { ConversationArtwork, ConversationAvatar, conversationContact, conversationTitle } from '@/components/messages/ConversationIdentity'
import { ConversationDetail } from './ConversationDetail'
import { authSessionIdentity } from '@/utils/sessionIdentity'
import './Messages.css'

type InboxResult = Awaited<ReturnType<typeof conversationsAPI.list>>
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es')
const previewDate = (value: string) => {
  const date = new Date(value)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) return date.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  return date.toDateString() === yesterday.toDateString() ? 'Ayer' : date.toLocaleDateString('es-BO', { day: 'numeric', month: 'short' })
}

export const Conversations = () => {
  const { id } = useParams<{ id: string }>()
  const { accessToken, user } = useAuth()
  const client = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const searchInput = useRef<HTMLInputElement>(null)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const query = useQuery({ queryKey: ['conversations', accessToken, page], queryFn: () => conversationsAPI.list(accessToken!, page, 20), enabled: !!accessToken })
  useRealtimeInbox({ accessToken, onNewMessage: () => { void client.invalidateQueries({ queryKey: ['conversations', accessToken] }) } })

  const markConversationRead = useCallback((conversationId: string) => {
    client.setQueriesData<InboxResult>({ queryKey: ['conversations', accessToken] }, previous => previous ? {
      ...previous, conversations: previous.conversations.map(conversation => conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation),
    } : previous)
    window.dispatchEvent(new Event('messages:read'))
  }, [accessToken, client])

  const conversations = query.data?.conversations || []
  const totalPages = Math.ceil((query.data?.pagination?.total || 0) / (query.data?.pagination?.pageSize || 20))
  const unreadConversations = conversations.filter(conversation => (conversation.unreadCount || 0) > 0).length
  const needle = normalize(search.trim())
  const visible = conversations.filter(conversation => {
    const contact = conversationContact(conversation, user?.id)
    return (!unreadOnly || (conversation.unreadCount || 0) > 0) &&
      (!needle || normalize(`${conversationTitle(conversation, user?.id)} ${contact?.organization?.name || ''}`).includes(needle))
  })

  return <div className="messages-page">
    <header className="page-heading messages-heading"><div className="messages-heading-title"><span className="messages-heading-icon"><Icon name="message" width="25" height="25" /></span><h1>Mensajes</h1></div>{user?.role === 'ADVISOR' && user.organizationId && <Link to="/organization/dashboard" className="messages-team-link"><Icon name="team" width="18" height="18" />Tu equipo<Icon name="arrow" width="16" height="16" /></Link>}</header>
    <div className={`messages-workspace ${id ? 'has-conversation' : ''}`}>
      <aside className="messages-inbox" aria-label="Conversaciones">
        <div className="messages-inbox-header">
          <div className="inbox-search"><Icon name="search" /><input ref={searchInput} type="search" aria-label="Buscar conversación" placeholder="Buscar conversación" value={search} onChange={event => setSearch(event.target.value)} />{search && <button type="button" className="inbox-clear-search" aria-label="Limpiar búsqueda" onClick={() => { setSearch(''); searchInput.current?.focus() }}><Icon name="close" width="15" height="15" /></button>}</div>
          <div className="inbox-filters" role="group" aria-label="Filtrar conversaciones">
            <button type="button" aria-pressed={!unreadOnly} onClick={() => setUnreadOnly(false)}><Icon name="message" width="16" height="16" />Todas</button>
            <button type="button" aria-pressed={unreadOnly} onClick={() => setUnreadOnly(true)}><Icon name="bell" width="16" height="16" />No leídas{unreadConversations > 0 && <span className="inbox-count" aria-label={`${unreadConversations} conversaciones sin leer en esta página`}>{unreadConversations > 99 ? '99+' : unreadConversations}</span>}</button>
          </div>
        </div>
        <nav className="inbox-list" aria-label="Lista de conversaciones" aria-busy={query.isFetching}>
          {query.isPending ? <p className="inbox-status" role="status">Cargando conversaciones…</p> : query.isError ? <div className="inbox-status" role="alert"><p>No pudimos cargar tus conversaciones.</p><button className="text-link" onClick={() => query.refetch()}>Reintentar</button></div> : !visible.length ? <div className="inbox-status"><Icon name="message" width="30" height="30" /><p>{search ? 'No encontramos coincidencias.' : unreadOnly ? 'No tienes conversaciones sin leer.' : 'Todavía no tienes conversaciones.'}</p>{!search && !unreadOnly && <Link to="/search" className="text-link">Explorar propiedades <Icon name="arrow" /></Link>}</div> : visible.map(conversation => {
            const contact = conversationContact(conversation, user?.id)
            const title = conversationTitle(conversation, user?.id)
            const lastMessage = conversation.messages?.[0]
            const unread = conversation.unreadCount || 0
            return <Link key={conversation.id} to={`/messages/${conversation.id}`} className={`inbox-conversation ${conversation.id === id ? 'is-selected' : ''} ${unread > 0 ? 'is-unread' : ''}`} aria-current={conversation.id === id ? 'page' : undefined}>
              <ConversationAvatar advisor={contact} title={title} />
              <div className="inbox-conversation-copy"><div className="inbox-conversation-title"><h3>{title}</h3>{conversation.lastMessageAt && <time dateTime={conversation.lastMessageAt}>{previewDate(conversation.lastMessageAt)}</time>}</div>
                <p className="inbox-organization">{contact?.organization?.name || 'Asesor inmobiliario'}</p>
                <div className="inbox-preview"><p>{lastMessage ? `${lastMessage.senderId === user?.id ? 'Tú' : lastMessage.sender?.firstName || contact?.firstName || 'Mensaje'}: ${lastMessage.content || (lastMessage.attachments?.length ? '📎 Archivo adjunto' : '')}` : 'Inicia la conversación'}</p>{unread > 0 && <span className="inbox-count" aria-label={`${unread} mensajes sin leer`}>{unread > 99 ? '99+' : unread}</span>}</div>
              </div>
            </Link>
          })}
        </nav>
        {totalPages > 1 && <div className="inbox-pagination"><p>Los filtros se aplican a esta página.</p><Pagination page={page} totalPages={totalPages} onChange={setPage} disabled={query.isFetching} /></div>}
      </aside>
      {id ? <ConversationDetail key={`${accessToken && (authSessionIdentity(accessToken) ?? accessToken)}:${id}`} conversationId={id} onRead={markConversationRead} /> : <section className="conversation-pane messages-placeholder" aria-label="Selecciona una conversación"><ConversationArtwork /><h2>Selecciona una conversación</h2><p>Lee, comparte y coordina con tu equipo.</p></section>}
    </div>
  </div>
}
