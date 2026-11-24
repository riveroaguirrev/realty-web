import type { MessageAttachment } from '@shared/messageAttachments'

export interface MessagingAdvisor {
  id: string
  firstName: string
  lastName: string
  profileImage?: string | null
  organization?: { id: string; name: string } | null
}

export interface ConversationMessage {
  id: string
  conversationId: string
  senderId: string
  content: string
  attachments?: MessageAttachment[]
  createdAt: string
  editedAt?: string | null
  sender?: MessagingAdvisor
}

export interface ConversationRecord {
  id: string
  type?: string
  name?: string | null
  lastMessageAt?: string | null
  unreadCount?: number
  participants: { advisorId: string; advisor: MessagingAdvisor }[]
  messages?: ConversationMessage[]
}
