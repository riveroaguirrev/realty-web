import { useNotificationStore } from '@/stores/notificationStore'

interface UnreadBadgeProps {
  conversationId?: string
}

export const UnreadBadge = ({ conversationId }: UnreadBadgeProps) => {
  const { unreadCount, unreadByConversation } = useNotificationStore()

  const count = conversationId
    ? unreadByConversation[conversationId]
    : unreadCount

  if (!count || count === 0) return null

  return (
    <span className="inline-flex items-center justify-center px-3 py-1 text-xs font-bold leading-none text-white transform translate-x-1 -translate-y-1 bg-red-600 rounded-full">
      {count > 99 ? '99+' : count}
    </span>
  )
}
