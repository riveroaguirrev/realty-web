import { useEffect } from 'react'
import { useNotificationStore } from '@/stores/notificationStore'
import { useRealtimeConversations } from './useRealtimeConversations'

interface UseNotificationsParams {
  advisorId?: string
  currentConversationId?: string
}

export const useNotifications = ({
  advisorId,
  currentConversationId,
}: UseNotificationsParams) => {
  const { addNotification, markConversationAsRead } = useNotificationStore()

  const subscription = useRealtimeConversations({
    advisorId,
    onNewMessage: (message) => {
      // Only create notification if:
      // 1. User is not in this conversation, OR
      // 2. User is in a different conversation
      if (!currentConversationId || currentConversationId !== message.conversationId) {
        addNotification({
          type: 'unread_message',
          conversationId: message.conversationId,
          title: `📬 Nuevo mensaje`,
          message: message.content.substring(0, 100),
        })
      }
    },
  })

  // Mark conversation as read when user opens it
  useEffect(() => {
    if (currentConversationId) {
      markConversationAsRead(currentConversationId)
    }
  }, [currentConversationId, markConversationAsRead])

  return {
    unsubscribe: subscription.unsubscribe,
  }
}
