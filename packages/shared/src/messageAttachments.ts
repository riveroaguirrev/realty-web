export const MAX_MESSAGE_FILES = 5
export const MAX_MESSAGE_FILE_BYTES = 3 * 1024 * 1024
export const MESSAGE_FILE_TYPES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  pdf: 'application/pdf',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain', csv: 'text/csv',
}
export const MESSAGE_FILE_ACCEPT = Object.keys(MESSAGE_FILE_TYPES).map(extension => `.${extension}`).join(',')
export interface MessageAttachment {
  id: string
  path: string
  name: string
  type: string
  size: number
}
export const messageFileExtension = (name: string) => name.split('.').pop()?.toLowerCase() || ''
export function messageFilesError(files: { name: string; size: number }[]): string | null {
  if (files.length > MAX_MESSAGE_FILES) return 'Puedes adjuntar hasta 5 archivos por mensaje.'
  if (files.some(file => !file.size)) return 'No se pueden enviar archivos vacíos.'
  if (files.reduce((total, file) => total + file.size, 0) > MAX_MESSAGE_FILE_BYTES) return 'Los archivos deben sumar 3 MB o menos por mensaje.'
  if (files.some(file => !MESSAGE_FILE_TYPES[messageFileExtension(file.name)])) return 'Usa fotos JPG, PNG o WebP, PDF, documentos de Office, TXT o CSV.'
  return null
}
export const attachmentSize = (size: number) => size >= 1024 * 1024 ? `${(size / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`
