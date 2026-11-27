const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }
const MAX_TOTAL_BYTES = 32 * 1024 * 1024

type FileShareTarget = Pick<Navigator, 'share' | 'canShare'>
export function isDesktopMac(device: Pick<Navigator, 'userAgent' | 'maxTouchPoints'> = navigator): boolean {
  return /Macintosh|Mac OS X/.test(device.userAgent) && !(device.maxTouchPoints > 1)
}

export function canSharePropertyPhotos(files: File[] | null, target: FileShareTarget = navigator): boolean {
  try { return !!files?.length && typeof target.share === 'function' && !!target.canShare?.({ files }) }
  catch { return false }
}

export function sharePreparedPropertyPhotos(files: File[], title: string, text: string, target: FileShareTarget = navigator): Promise<void> {
  if (!canSharePropertyPhotos(files, target)) return Promise.reject(new Error('Este dispositivo no permite compartir estas fotografías directamente.'))
  // Pass the selected original files, not their URLs or a text-only WhatsApp link.
  return target.share({ files, title, text })
}

export async function preparePropertyPhotos(urls: string[], title: string, signal: AbortSignal): Promise<File[]> {
  if (!urls.length || urls.length > 20) throw new Error('Elige entre 1 y 20 fotografías.')
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal.addEventListener('abort', abort, { once: true })
  if (signal.aborted) controller.abort()
  const files: File[] = new Array(urls.length)
  const name = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 60) || 'propiedad'
  let cursor = 0
  let total = 0
  try {
    await Promise.all(Array.from({ length: Math.min(3, urls.length) }, async () => {
      while (cursor < urls.length) {
        const index = cursor++
        const response = await fetch(urls[index], { signal: controller.signal, credentials: 'omit' })
        if (!response.ok) throw new Error('No pudimos descargar todas las fotos. Intenta prepararlas nuevamente.')
        const length = Number(response.headers.get('content-length'))
        if (length > MAX_TOTAL_BYTES) throw new Error('Las fotos superan 32 MB. Selecciona menos fotografías.')
        const blob = await response.blob()
        const type = blob.type.split(';')[0].toLowerCase()
        if (!extensions[type] || !blob.size) throw new Error('Una fotografía no tiene un formato compatible. Desmárcala y vuelve a intentar.')
        total += blob.size
        if (total > MAX_TOTAL_BYTES) throw new Error('Las fotos superan 32 MB. Selecciona menos fotografías.')
        files[index] = new File([blob], `realty-${name}-${index + 1}.${extensions[type]}`, { type })
      }
    }))
    if (signal.aborted) throw new DOMException('Preparación cancelada', 'AbortError')
    return files
  } catch (error) {
    controller.abort()
    throw error
  } finally { signal.removeEventListener('abort', abort) }
}
