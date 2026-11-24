import { useEffect, useState } from 'react'
import { Icon } from './Icon'

export const CopyableCode = ({ code }: { code: string }) => {
  const [copied, setCopied] = useState(false)
  const [copying, setCopying] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { setCopied(false); setError('') }, [code])
  useEffect(() => {
    if (!copied) return
    const timeout = window.setTimeout(() => setCopied(false), 2500)
    return () => window.clearTimeout(timeout)
  }, [copied])
  const copy = async () => {
    setError('')
    setCopying(true)
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(code)
      setCopied(true)
    } catch {
      setCopied(false)
      setError('No pudimos copiar. Puedes seleccionar el código y copiarlo manualmente.')
    } finally { setCopying(false) }
  }
  return <div className="org-copyable-code">
    <code>{code}</code>
    <button type="button" className="org-copy-code" onClick={() => { void copy() }} disabled={copying} aria-label={copied ? 'Código copiado' : 'Copiar código de invitación'} title={copied ? 'Código copiado' : 'Copiar código'}><Icon name={copied ? 'check' : 'copy'} width="17" height="17" /></button>
    {copied && <span className="org-copy-feedback" role="status">Copiado</span>}
    {error && <span className="org-copy-error" role="alert">{error}</span>}
  </div>
}
