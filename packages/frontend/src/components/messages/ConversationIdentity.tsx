import type { ConversationRecord, MessagingAdvisor } from '@/types/messaging'

export const conversationContact = (conversation: ConversationRecord, userId?: string) =>
  conversation.participants.find(participant => participant.advisorId !== userId)?.advisor

export const conversationTitle = (conversation: ConversationRecord, userId?: string) => {
  if (conversation.name) return conversation.name
  const contact = conversationContact(conversation, userId)
  return contact ? `${contact.firstName} ${contact.lastName}`.trim() : 'Conversación'
}

export const ConversationAvatar = ({ advisor, title }: { advisor?: MessagingAdvisor; title: string }) => <span className="conversation-avatar" aria-hidden="true">
  {advisor?.profileImage ? <img src={advisor.profileImage} alt="" /> : title.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase()}
</span>

export const ConversationArtwork = () => <svg className="conversation-artwork" width="150" height="112" viewBox="0 0 150 112" fill="none" aria-hidden="true">
  <path d="M25 9h43c15 0 25 10 25 24v15c0 14-10 24-25 24H46L25 87V72C12 70 6 61 6 48V33C6 19 13 9 25 9Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
  <path d="M90 44h30c14 0 23 9 23 22v12c0 12-7 20-19 22v11l-17-11H90c-14 0-24-9-24-22V66c0-13 10-22 24-22Z" fill="var(--swiss-ground)" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
  <g fill="currentColor"><circle cx="31" cy="39" r="3" /><circle cx="48" cy="39" r="3" /><circle cx="65" cy="39" r="3" /><circle cx="88" cy="73" r="3" /><circle cx="105" cy="73" r="3" /><circle cx="122" cy="73" r="3" /></g>
</svg>
