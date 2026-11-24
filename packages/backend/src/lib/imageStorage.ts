import { supabase } from '@/lib/supabase'
import { MAX_IMAGE_BYTES } from '@/utils/validateImage'

export const imageExtensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const readyBuckets = new Set<string>()

export async function ensurePublicImageBucket(name: string) {
  if (readyBuckets.has(name)) return
  const { data: existing } = await supabase.storage.getBucket(name)
  if (!existing) {
    const { error } = await supabase.storage.createBucket(name, {
      public: true,
      fileSizeLimit: MAX_IMAGE_BYTES,
      allowedMimeTypes: Object.keys(imageExtensions),
    })
    if (error && !(await supabase.storage.getBucket(name)).data) {
      throw new Error(`Failed to create storage bucket: ${error.message}`)
    }
  }
  readyBuckets.add(name)
}
