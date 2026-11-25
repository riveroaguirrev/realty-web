import { contactPhoneSchema } from '@shared/validation/auth'

type ContactContext =
  | { kind: 'property'; title: string; city: string; operation: string; url: string }
  | { kind: 'advisor'; sender: string }
  | { kind: 'requirement'; title: string; url: string }

export function whatsappUrl(phone: string | null | undefined, recipient: string, context: ContactContext) {
  const number = contactPhoneSchema.safeParse(phone)
  if (!number.success) return null

  let message: string
  switch (context.kind) {
    case 'property':
      message = `Hola, ${recipient}. Vi en Realty «${context.title}» en ${context.city} (${context.operation}). ¿Me puedes dar más información? ${context.url}`
      break
    case 'advisor':
      message = `Hola, ${recipient}. Soy ${context.sender}. Te escribo desde Realty.`
      break
    case 'requirement':
      message = `Hola, ${recipient}. Vi tu búsqueda «${context.title}» en Realty y quisiera consultarte sobre ella. ${context.url}`
      break
  }
  return `https://wa.me/${number.data.slice(1)}?text=${encodeURIComponent(message)}`
}
