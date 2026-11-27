import { useEffect, useState } from 'react'
import { Icon } from '@/components/ui/Icon'

export function MessageCopyButton({ content }: { content: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  useEffect(() => {
    if (status === 'idle') return
    const timer = window.setTimeout(() => setStatus('idle'), 2500)
    return () => window.clearTimeout(timer)
  }, [status])
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setStatus('copied')
    } catch { setStatus('error') }
  }
  return <span className="message-copy-action"><button type="button" className="message-copy" onClick={() => { void copy() }} aria-label={status === 'copied' ? 'Texto copiado' : 'Copiar texto del mensaje'} title={status === 'copied' ? 'Copiado' : 'Copiar texto'}><Icon name={status === 'copied' ? 'check' : 'copy'} width="14" height="14" /></button>{status !== 'idle' && <span className="message-copy-feedback" role="status">{status === 'copied' ? 'Copiado' : 'Selecciona el texto para copiarlo.'}</span>}</span>
}
