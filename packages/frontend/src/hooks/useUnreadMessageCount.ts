import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { conversationsAPI } from '@/services/conversations'
import { useRealtimeInbox } from './useRealtimeInbox'

export const unreadMessageCountKey = ['unread-message-count'] as const

export const useUnreadMessageCount = (accessToken?: string | null) => {
  const queryClient = useQueryClient()
  const queryKey = [...unreadMessageCountKey, accessToken]
  const count = useQuery({
    queryKey,
    queryFn: () => conversationsAPI.unreadCount(accessToken!),
    enabled: !!accessToken,
  })
  useRealtimeInbox({ accessToken, onNewMessage: () => { void queryClient.invalidateQueries({ queryKey }) } })
  useEffect(() => {
    const refresh = () => { void queryClient.invalidateQueries({ queryKey: [...unreadMessageCountKey, accessToken] }) }
    window.addEventListener('messages:read', refresh)
    return () => window.removeEventListener('messages:read', refresh)
  }, [accessToken, queryClient])
  return count.data ?? 0
}
