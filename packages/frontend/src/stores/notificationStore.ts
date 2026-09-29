import { create } from 'zustand'

export interface Notification {
  id: string
  type: 'unread_message' | 'conversation_update' | 'system'
  conversationId?: string
  title: string
  message: string
  read: boolean
  createdAt: Date
}

interface NotificationStore {
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void
  markAsRead: (notificationId: string) => void
  markConversationAsRead: (conversationId: string) => void
  removeNotification: (notificationId: string) => void
}

// Toast notifications only. Unread counters live on the server (see conversationsAPI).
export const useNotificationStore = create<NotificationStore>()((set) => ({
  notifications: [],

  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        { ...notification, id: crypto.randomUUID(), read: false, createdAt: new Date() },
        ...state.notifications,
      ],
    })),

  markAsRead: (notificationId) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      ),
    })),

  markConversationAsRead: (conversationId) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.conversationId === conversationId ? { ...n, read: true } : n
      ),
    })),

  removeNotification: (notificationId) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== notificationId),
    })),
}))
