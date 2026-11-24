import sharp from 'sharp'
import { ApiError } from '@/utils/errors'

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024
const MAX_MULTIPART_BYTES = MAX_IMAGE_BYTES + 64 * 1024
const MAX_INPUT_PIXELS = 50_000_000
const MAX_OUTPUT_SIDE = 4096

const invalidImage = () => new ApiError(400, 'INVALID_IMAGE', 'No pudimos leer la imagen. Usa una foto JPEG, PNG o WebP válida.')
const oversizedImage = () => new ApiError(413, 'IMAGE_TOO_LARGE', 'La imagen debe pesar 4 MB o menos.')
const mimeByFormat = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' } as const

export async function readImageForm(request: Request): Promise<FormData> {
  const type = request.headers.get('content-type')
  if (!type?.toLowerCase().startsWith('multipart/form-data;') || !request.body) {
    throw new ApiError(400, 'INVALID_IMAGE_FORM', 'Envía una imagen en un formulario multipart.')
  }
  if (Number(request.headers.get('content-length')) > MAX_MULTIPART_BYTES) throw oversizedImage()

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_MULTIPART_BYTES) {
        await reader.cancel().catch(() => undefined)
        throw oversizedImage()
      }
      chunks.push(value)
    }
    return await new Response(new Uint8Array(Buffer.concat(chunks, size)), {
      headers: { 'Content-Type': type },
    }).formData()
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(400, 'INVALID_IMAGE_FORM', 'No pudimos leer el formulario de imagen.')
  } finally {
    reader.releaseLock()
  }
}

export async function normalizeImage(file: File, maxSide = MAX_OUTPUT_SIDE) {
  if (file.size > MAX_IMAGE_BYTES) throw oversizedImage()
  const bytes = Buffer.from(await file.arrayBuffer())
  // Check the input signature before invoking native decoders.
  const format = bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) ? 'jpeg'
    : bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? 'png'
    : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' ? 'webp'
    : null
  if (!format || mimeByFormat[format] !== file.type) throw invalidImage()

  try {
    const image = sharp(bytes, { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'warning' })
    const metadata = await image.metadata()
    if (metadata.format !== format) throw invalidImage()
    const normalized = image.autoOrient().resize({
      width: maxSide, height: maxSide, fit: 'inside', withoutEnlargement: true,
    })
    const output = await normalized.clone().toFormat(format).toBuffer()
    if (output.byteLength <= MAX_IMAGE_BYTES) return { bytes: output, type: mimeByFormat[format] }

    const compact = await normalized.webp({ quality: 82 }).toBuffer()
    if (compact.byteLength > MAX_IMAGE_BYTES) throw oversizedImage()
    return { bytes: compact, type: mimeByFormat.webp }
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw invalidImage()
  }
}

export async function readImageUpload(request: Request, maxSide?: number) {
  const files = (await readImageForm(request)).getAll('file')
  const file = files[0]
  if (files.length !== 1 || !file || typeof file === 'string') {
    throw new ApiError(400, 'INVALID_IMAGE_FORM', 'Envía una sola imagen por solicitud.')
  }
  return normalizeImage(file, maxSide)
}
