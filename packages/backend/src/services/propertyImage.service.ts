import { randomUUID } from 'crypto'
import { supabase } from '@/lib/supabase'

const BUCKET_NAME = 'properties'
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export interface UploadedImage {
  type: string
  size: number
  arrayBuffer(): Promise<ArrayBuffer>
}

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export class PropertyImageService {
  private bucketReady = false

  isSupportedMimeType(mimeType: string): boolean {
    return mimeType in EXTENSION_BY_MIME_TYPE
  }

  async upload(file: UploadedImage, advisorId: string): Promise<string> {
    await this.ensureBucket()

    const path = `${advisorId}/${randomUUID()}.${EXTENSION_BY_MIME_TYPE[file.type]}`
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, await file.arrayBuffer(), { contentType: file.type })

    if (error) throw new Error(`Failed to upload image: ${error.message}`)

    return supabase.storage.from(BUCKET_NAME).getPublicUrl(path).data.publicUrl
  }

  async deleteByUrls(urls: string[]): Promise<void> {
    const paths = urls.map((url) => this.extractStoragePath(url)).filter((path): path is string => !!path)
    if (paths.length === 0) return

    const { error } = await supabase.storage.from(BUCKET_NAME).remove(paths)
    if (error) console.error('Failed to delete property images:', error.message)
  }

  private extractStoragePath(url: string): string | null {
    const marker = `/storage/v1/object/public/${BUCKET_NAME}/`
    const index = url.indexOf(marker)
    return index === -1 ? null : decodeURIComponent(url.slice(index + marker.length))
  }

  private async ensureBucket(): Promise<void> {
    if (this.bucketReady) return

    const { data: existing } = await supabase.storage.getBucket(BUCKET_NAME)
    if (!existing) {
      const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: MAX_IMAGE_BYTES,
        allowedMimeTypes: Object.keys(EXTENSION_BY_MIME_TYPE),
      })
      if (error) throw new Error(`Failed to create storage bucket: ${error.message}`)
    }
    this.bucketReady = true
  }
}

export const propertyImageService = new PropertyImageService()
