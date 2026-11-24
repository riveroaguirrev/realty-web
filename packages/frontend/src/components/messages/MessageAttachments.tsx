import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { messagesAPI } from '@/services/messages'
import { Icon } from '@/components/ui/Icon'
import { attachmentSize, type MessageAttachment } from '@shared/messageAttachments'

export const DraftAttachment = ({ file, onRemove, disabled }: { file: File; onRemove: () => void; disabled: boolean }) => {
  const [preview, setPreview] = useState('')
  useEffect(() => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  return <div className="draft-attachment">
    {preview ? <img src={preview} alt="" /> : <Icon name="file" />}
    <span><strong>{file.name}</strong><small>{attachmentSize(file.size)}</small></span>
    <button type="button" onClick={onRemove} disabled={disabled} aria-label={`Quitar ${file.name}`}><Icon name="close" width="16" height="16" /></button>
  </div>
}
export const MessageAttachmentCard = ({ file, token, conversationId, messageId }: { file: MessageAttachment; token: string; conversationId: string; messageId: string }) => {
  const [imageFailed, setImageFailed] = useState(false)
  const query = useQuery({
    queryKey: ['message-file', token, conversationId, messageId, file.id],
    queryFn: () => messagesAPI.attachment(token, conversationId, messageId, file.id),
    staleTime: 240000, refetchInterval: 240000, retry: 1,
  })
  const image = file.type.startsWith('image/')
  return <div className="message-attachment">
    {image && query.data && !imageFailed && <a href={query.data.url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir foto ${file.name}`}><img src={query.data.url} alt={file.name} loading="lazy" onError={() => setImageFailed(true)} /></a>}
    <div className="message-file-info"><Icon name="file" /><span><strong>{file.name}</strong><small>{attachmentSize(file.size)}</small></span>
      {query.data && <a href={query.data.downloadUrl} target="_blank" rel="noopener noreferrer" download={file.name} aria-label={`Descargar ${file.name}`} title="Descargar archivo"><Icon name="download" /></a>}
    </div>
    {query.isPending && <small role="status">Preparando archivo…</small>}
    {(query.isError || imageFailed) && <button type="button" className="message-file-retry" onClick={() => { setImageFailed(false); void query.refetch() }}>Reintentar abrir archivo</button>}
  </div>
}
