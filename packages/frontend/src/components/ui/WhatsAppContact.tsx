import { whatsappUrl } from '@/utils/whatsapp'
import { Icon } from './Icon'

export function WhatsAppContact({ phone, recipient, context, className = '', label = 'Contactar por WhatsApp', withIcon = false }: {
  phone?: string | null
  recipient: string
  context: Parameters<typeof whatsappUrl>[2]
  className?: string
  label?: string
  withIcon?: boolean
}) {
  const url = whatsappUrl(phone, recipient, context)
  if (!url) return null

  return <a className={`button button-secondary ${className}`} href={url} target="_blank" rel="noopener noreferrer">{withIcon && <Icon name="whatsapp" fill="currentColor" stroke="none" />}{label}</a>
}
