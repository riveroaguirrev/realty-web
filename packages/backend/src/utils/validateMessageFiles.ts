import { MAX_MESSAGE_FILE_BYTES, MESSAGE_FILE_TYPES, messageFileExtension, messageFilesError } from '@shared/messageAttachments'
import { ApiError } from '@/utils/errors'
import { normalizeImage } from './validateImage'

const MAX_REQUEST_BYTES = MAX_MESSAGE_FILE_BYTES + 128 * 1024
export async function readMessageForm(request: Request): Promise<FormData> {
  const contentType = request.headers.get('content-type') || ''
  const tooLarge = () => new ApiError(413, 'FILES_TOO_LARGE', 'Los archivos deben sumar 3 MB o menos por mensaje.')
  if (!contentType.toLowerCase().startsWith('multipart/form-data;') || !request.body) throw new ApiError(400, 'INVALID_FORM', 'No pudimos leer los archivos adjuntos.')
  if (Number(request.headers.get('content-length')) > MAX_REQUEST_BYTES) throw tooLarge()
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_REQUEST_BYTES) { await reader.cancel().catch(() => undefined); throw tooLarge() }
      chunks.push(value)
    }
    return await new Response(new Uint8Array(Buffer.concat(chunks, size)), { headers: { 'Content-Type': contentType } }).formData()
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(400, 'INVALID_FORM', 'No pudimos leer los archivos adjuntos.')
  } finally { reader.releaseLock() }
}
export async function validateMessageFiles(files: File[]) {
  const error = messageFilesError(files)
  if (error) throw new ApiError(400, 'INVALID_ATTACHMENTS', error)
  return Promise.all(files.map(async file => {
    const extension = messageFileExtension(file.name)
    const type = MESSAGE_FILE_TYPES[extension]
    const name = Array.from(file.name, character => {
      const code = character.charCodeAt(0)
      return character === '/' || character === '\\' || code < 32 || code === 127 ? '_' : character
    }).join('').slice(0, 180)
    if (type.startsWith('image/')) {
      const normalized = await normalizeImage(new File([new Uint8Array(await file.arrayBuffer())], name, { type }))
      return { ...normalized, name, extension: normalized.type === 'image/webp' ? 'webp' : extension }
    }
    const bytes = Buffer.from(await file.arrayBuffer())
    const zip = ['docx', 'xlsx', 'pptx'].includes(extension)
    const office = ['doc', 'xls', 'ppt'].includes(extension)
    const valid = extension === 'pdf' ? bytes.toString('ascii', 0, 5) === '%PDF-'
      : zip ? bytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 3, 4]))
      : office ? bytes.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))
      : !bytes.includes(0)
    if (!valid) throw new ApiError(400, 'INVALID_FILE', 'Un archivo no coincide con su formato. Revisa los adjuntos e inténtalo de nuevo.')
    return { bytes, type, name, extension }
  }))
}
