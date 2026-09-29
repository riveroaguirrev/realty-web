import { useCallback, useEffect } from 'react'
import { useNotificationStore } from '@/stores/notificationStore'
import { IncomingMessage, useRealtimeInbox } from './useRealtimeInbox'

const PREVIEW_LENGTH = 100

interface UseNotificationsParams {
  accessToken?: string | null
  userId?: string
  currentConversationId?: string
}

export const useNotifications = ({
  accessToken,
  userId,
  currentConversationId,
}: UseNotificationsParams) => {
  const addNotification = useNotificationStore((state) => state.addNotification)
  const markConversationAsRead = useNotificationStore((state) => state.markConversationAsRead)

  const handleNewMessage = useCallback(
    (message: IncomingMessage) => {
      const isOwnMessage = message.senderId === userId
      const isViewingConversation = message.conversationId === currentConversationId
      if (isOwnMessage || isViewingConversation) return

      addNotification({
        type: 'unread_message',
        conversationId: message.conversationId,
        title: '📬 Nuevo mensaje',
        message: message.content.substring(0, PREVIEW_LENGTH),
      })
    },
    [userId, currentConversationId, addNotification]
  )

  useRealtimeInbox({ accessToken, onNewMessage: handleNewMessage })

  useEffect(() => {
    if (currentConversationId) markConversationAsRead(currentConversationId)
  }, [currentConversationId, markConversationAsRead])
}
