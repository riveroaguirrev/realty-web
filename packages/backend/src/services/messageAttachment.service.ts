import { randomUUID } from 'crypto'
import { supabase } from '@/lib/supabase'
import { ApiError } from '@/utils/errors'
import { MAX_MESSAGE_FILE_BYTES, MESSAGE_FILE_TYPES, type MessageAttachment } from '@shared/messageAttachments'
import { validateMessageFiles } from '@/utils/validateMessageFiles'

const BUCKET = 'message-attachments'
export const readAttachments = (value: unknown): MessageAttachment[] => Array.isArray(value) ? value.filter((item): item is MessageAttachment => !!item && typeof item === 'object' && typeof item.id === 'string' && typeof item.path === 'string' && typeof item.name === 'string' && typeof item.type === 'string' && typeof item.size === 'number') : []
export class MessageAttachmentService {
  private bucketReady = false
  async ensureBucket() {
    if (this.bucketReady) return
    let { data: bucket, error: lookupError } = await supabase.storage.getBucket(BUCKET)
    if (!bucket) {
      if (lookupError && !['404', '400'].includes(String(lookupError.statusCode))) throw new Error('No se pudo acceder al almacenamiento de adjuntos.')
      const { error } = await supabase.storage.createBucket(BUCKET, { public: false, fileSizeLimit: MAX_MESSAGE_FILE_BYTES, allowedMimeTypes: [...new Set(Object.values(MESSAGE_FILE_TYPES))] })
      const result = await supabase.storage.getBucket(BUCKET)
      bucket = result.data
      if (error && !bucket) throw new Error('No se pudo preparar el almacenamiento de adjuntos.')
    }
    if (!bucket || bucket.public) throw new Error('Los adjuntos requieren almacenamiento privado.')
    this.bucketReady = true
  }
  async upload(conversationId: string, files: File[]): Promise<MessageAttachment[]> {
    const validated = await validateMessageFiles(files)
    if (!validated.length) return []
    if (validated.reduce((total, file) => total + file.bytes.length, 0) > MAX_MESSAGE_FILE_BYTES) throw new ApiError(413, 'FILES_TOO_LARGE', 'Los archivos deben sumar 3 MB o menos por mensaje.')
    await this.ensureBucket()
    const attachments: MessageAttachment[] = []
    try {
      for (const file of validated) {
        const id = randomUUID()
        const path = `${conversationId}/${id}.${file.extension}`
        const { error } = await supabase.storage.from(BUCKET).upload(path, file.bytes, { contentType: file.type, upsert: false })
        if (error) throw new ApiError(502, 'UPLOAD_FAILED', 'No pudimos subir los archivos. Inténtalo de nuevo.')
        attachments.push({ id, path, name: file.name, type: file.type, size: file.bytes.length })
      }
      return attachments
    } catch (error) { await this.remove(attachments); throw error }
  }
  async remove(attachments: MessageAttachment[]) {
    if (!attachments.length) return
    try {
      const { error } = await supabase.storage.from(BUCKET).remove(attachments.map(file => file.path))
      if (error) console.error('No se pudieron limpiar los adjuntos privados.')
    } catch { console.error('No se pudieron limpiar los adjuntos privados.') }
  }
  async signedUrl(file: MessageAttachment, download: boolean) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(file.path, 300, { download: download || !file.type.startsWith('image/') ? file.name : false })
    if (error || !data?.signedUrl) throw new ApiError(404, 'ATTACHMENT_NOT_FOUND', 'No pudimos abrir este archivo. Inténtalo de nuevo.')
    return data.signedUrl
  }
}
export const messageAttachmentService = new MessageAttachmentService()
