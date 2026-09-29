import { useCallback, useEffect, useState } from 'react'
import { conversationsAPI } from '@/services/conversations'
import { useRealtimeInbox } from './useRealtimeInbox'

export const useUnreadMessageCount = (accessToken?: string | null) => {
  const [count, setCount] = useState(0)

  const refresh = useCallback(() => {
    if (!accessToken) return
    conversationsAPI
      .unreadCount(accessToken)
      .then(setCount)
      .catch((error) => console.error('Failed to load unread message count:', error))
  }, [accessToken])

  useEffect(refresh, [refresh])

  useRealtimeInbox({ accessToken, onNewMessage: refresh })

  return count
}
