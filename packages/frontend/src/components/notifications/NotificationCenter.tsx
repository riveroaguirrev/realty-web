import { useNotificationStore } from '@/stores/notificationStore'
import { useEffect } from 'react'

export const NotificationCenter = () => {
  const { notifications, removeNotification, markAsRead } = useNotificationStore()

  // Auto-dismiss notifications after 5 seconds
  useEffect(() => {
    const timers = notifications
      .filter((n) => !n.read)
      .map((n) =>
        setTimeout(() => {
          markAsRead(n.id)
        }, 5000)
      )

    return () => timers.forEach((t) => clearTimeout(t))
  }, [notifications, markAsRead])

  const recentNotifications = notifications.slice(0, 3)

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 max-w-sm">
      {recentNotifications.map((notification) => (
        <div
          key={notification.id}
          className={`p-4 rounded-lg shadow-lg animate-in slide-in-from-right ${
            notification.type === 'unread_message'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-800 text-white'
          }`}
        >
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1">
              <p className="font-semibold text-sm">{notification.title}</p>
              <p className="text-xs opacity-90">{notification.message}</p>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
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
