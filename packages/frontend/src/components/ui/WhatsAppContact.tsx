import { whatsappUrl } from '@/utils/whatsapp'

export function WhatsAppContact({ phone, recipient, context, className = '' }: {
  phone?: string | null
  recipient: string
  context: Parameters<typeof whatsappUrl>[2]
  className?: string
}) {
  const url = whatsappUrl(phone, recipient, context)
  if (!url) return null

  return <a className={`button button-secondary ${className}`} href={url} target="_blank" rel="noopener noreferrer">Contactar por WhatsApp</a>
}
