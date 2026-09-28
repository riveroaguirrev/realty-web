import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
  unreadCount: number
  unreadByConversation: Record<string, number>

  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void
  markAsRead: (notificationId: string) => void
  markConversationAsRead: (conversationId: string) => void
  clearAll: () => void
  removeNotification: (notificationId: string) => void
  getUnreadCount: () => number
  getUnreadByConversation: (conversationId: string) => number
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      unreadByConversation: {},

      addNotification: (notification) => {
        const id = `notif-${Date.now()}`
        const newNotification: Notification = {
          ...notification,
          id,
          read: false,
          createdAt: new Date(),
        }

        set((state) => {
          const updated = [newNotification, ...state.notifications]
          const unreadCount = updated.filter((n) => !n.read).length
          const unreadByConv = { ...state.unreadByConversation }

          if (notification.conversationId) {
            unreadByConv[notification.conversationId] =
              (unreadByConv[notification.conversationId] || 0) + 1
          }

          return {
            notifications: updated,
            unreadCount,
            unreadByConversation: unreadByConv,
          }
        })
      },

      markAsRead: (notificationId: string) => {
        set((state) => {
          const updated = state.notifications.map((n) =>
            n.id === notificationId ? { ...n, read: true } : n
          )
          const unreadCount = updated.filter((n) => !n.read).length

          return {
            notifications: updated,
            unreadCount,
          }
        })
      },

      markConversationAsRead: (conversationId: string) => {
        set((state) => {
          const updated = state.notifications.map((n) =>
            n.conversationId === conversationId ? { ...n, read: true } : n
          )
          const unreadCount = updated.filter((n) => !n.read).length
          const unreadByConv = { ...state.unreadByConversation }
          unreadByConv[conversationId] = 0

          return {
            notifications: updated,
            unreadCount,
            unreadByConversation: unreadByConv,
          }
        })
      },

      clearAll: () => {
        set({
          notifications: [],
          unreadCount: 0,
          unreadByConversation: {},
        })
      },

      removeNotification: (notificationId: string) => {
        set((state) => {
          const updated = state.notifications.filter((n) => n.id !== notificationId)
          const unreadCount = updated.filter((n) => !n.read).length

          return {
            notifications: updated,
            unreadCount,
          }
        })
      },

      getUnreadCount: () => {
        return get().unreadCount
      },

      getUnreadByConversation: (conversationId: string) => {
        return get().unreadByConversation[conversationId] || 0
      },
    }),
    {
      name: 'notification-store',
      partialize: (state) => ({
        notifications: state.notifications,
        unreadCount: state.unreadCount,
        unreadByConversation: state.unreadByConversation,
      }),
    }
  )
)
