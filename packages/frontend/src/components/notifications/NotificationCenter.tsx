import { useEffect, useMemo } from 'react'
import { useMatch } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import { useNotificationStore } from '@/stores/notificationStore'

const AUTO_DISMISS_MS = 5000
const MAX_VISIBLE_TOASTS = 3

export const NotificationCenter = () => {
  const { user, accessToken } = useAuth()
  const conversationMatch = useMatch('/messages/:id')
  const { notifications, removeNotification, markAsRead } = useNotificationStore()

  useNotifications({
    accessToken,
    userId: user?.id,
    currentConversationId: conversationMatch?.params.id,
  })

  const visibleNotifications = useMemo(
    () => notifications.filter((n) => !n.read).slice(0, MAX_VISIBLE_TOASTS),
    [notifications]
  )

  useEffect(() => {
    const timers = visibleNotifications.map((n) =>
      setTimeout(() => markAsRead(n.id), AUTO_DISMISS_MS)
    )
    return () => timers.forEach(clearTimeout)
  }, [visibleNotifications, markAsRead])

  return (
    <div aria-live="polite" aria-label="Notificaciones" className="fixed top-20 right-4 z-50 space-y-2 max-w-sm">
      {visibleNotifications.map((notification) => (
        <div
          key={notification.id}
          className="p-4 rounded-lg shadow-lg bg-blue-500 text-white"
        >
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1">
              <p className="font-semibold text-sm">{notification.title}</p>
              <p className="text-xs opacity-90">{notification.message}</p>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              aria-label="Cerrar notificación"
              className="text-lg hover:opacity-70 transition-opacity flex-shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
