import { randomUUID } from 'crypto'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { ApiError } from '@/utils/errors'
import { MAX_IMAGE_BYTES } from '@/utils/validatePropertyImage'
import { supabase } from '@/lib/supabase'

const BUCKET_NAME = 'properties'

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export class PropertyImageService {
  private bucketReady = false

  async upload(image: { bytes: Buffer; type: string }, advisorId: string): Promise<string> {
    await this.ensureBucket()

    const path = `${advisorId}/${randomUUID()}.${EXTENSION_BY_MIME_TYPE[image.type]}`
    const bucket = supabase.storage.from(BUCKET_NAME)
    const url = bucket.getPublicUrl(path).data.publicUrl
    const { error } = await bucket.upload(path, image.bytes, { contentType: image.type })
    if (error) throw new Error(`Failed to upload image: ${error.message}`)

    try {
      await prisma.propertyImage.create({ data: { path, url, uploadedBy: advisorId } })
    } catch (error) {
      // This request created the unique path. No property can attach it before registration.
      await bucket.remove([path]).catch(() => undefined)
      throw error
    }
    return url
  }

  async attach(tx: Prisma.TransactionClient, propertyId: string, advisorId: string, before: string[], after: string[]) {
    const additions = [...new Set(after)].filter(url => !before.includes(url))
    if (additions.length) {
      const attached = await tx.propertyImage.updateMany({
        where: { url: { in: additions }, uploadedBy: advisorId, propertyId: null, removedAt: null },
        data: { propertyId },
      })
      if (attached.count !== additions.length) {
        throw new ApiError(400, 'INVALID_PROPERTY_IMAGE', 'Vuelve a cargar las fotos nuevas para adjuntarlas a este inmueble.')
      }
    }

    const removals = before.filter(url => !after.includes(url))
    if (removals.length) {
      await tx.propertyImage.updateMany({
        where: { propertyId, url: { in: removals }, removedAt: null },
        data: { removedAt: new Date() },
      })
    }
  }

  async cleanupRemovedImages() {
    const expiration = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const abandoned = { propertyId: null, removedAt: null, createdAt: { lt: expiration } }
    const images = await prisma.propertyImage.findMany({
      where: { OR: [{ removedAt: { not: null } }, abandoned] },
      orderBy: [{ removedAt: 'asc' }, { id: 'asc' }],
      take: 25,
    })

    let removed = 0
    for (const image of images) {
      if (!image.removedAt) {
        const claim = await prisma.propertyImage.updateMany({
          where: { id: image.id, ...abandoned },
          data: { removedAt: new Date() },
        })
        if (!claim.count) continue
      }

      const reference = await prisma.property.findFirst({
        where: { images: { has: image.url } },
        select: { id: true },
      })
      if (reference) {
        await prisma.propertyImage.updateMany({ where: { id: image.id }, data: { removedAt: new Date() } })
        continue
      }

      const { error } = await supabase.storage.from(BUCKET_NAME).remove([image.path])
      if (error) {
        // Move failed rows to the end so a persistent failure cannot block the queue.
        await prisma.propertyImage.updateMany({ where: { id: image.id }, data: { removedAt: new Date() } })
        console.error('Property image cleanup failed:', error.statusCode)
        continue
      }
      const result = await prisma.propertyImage.deleteMany({ where: { id: image.id } })
      removed += result.count
    }
    return removed
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
      if (error && !(await supabase.storage.getBucket(BUCKET_NAME)).data) {
        throw new Error(`Failed to create storage bucket: ${error.message}`)
      }
    }
    this.bucketReady = true
  }
}

export const propertyImageService = new PropertyImageService()
