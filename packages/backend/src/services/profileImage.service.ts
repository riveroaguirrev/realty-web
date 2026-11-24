import { randomUUID } from 'node:crypto'
import { ensurePublicImageBucket, imageExtensions } from '@/lib/imageStorage'
import { prisma } from '@/lib/prisma'
import { supabase } from '@/lib/supabase'
import { ApiError, Errors } from '@/utils/errors'

const bucketName = 'profile-images'

export async function replaceProfileImage(advisorId: string, image: { bytes: Buffer; type: string }) {
  await ensurePublicImageBucket(bucketName)
  const bucket = supabase.storage.from(bucketName)
  const path = `${advisorId}/${randomUUID()}.${imageExtensions[image.type]}`
  const url = bucket.getPublicUrl(path).data.publicUrl
  const remove = async (file: string) => {
    try {
      const { error } = await bucket.remove([file])
      if (error) console.error('Profile image cleanup failed:', error.statusCode)
    } catch (error) {
      console.error('Profile image cleanup failed:', error instanceof Error ? error.name : 'UnknownError')
    }
  }

  const { error } = await bucket.upload(path, image.bytes, { contentType: image.type })
  if (error) throw new ApiError(503, 'PROFILE_IMAGE_UPLOAD_FAILED', 'No pudimos subir tu foto. Inténtalo de nuevo.')

  const { advisor, previousUrl } = await prisma.$transaction(async (tx) => {
    const [previous] = await tx.$queryRaw<{ profileImage: string | null }[]>`
      SELECT "profileImage" FROM "Advisor" WHERE id = ${advisorId} FOR NO KEY UPDATE
    `
    if (!previous) throw Errors.USER_NOT_FOUND
    const advisor = await tx.advisor.update({ where: { id: advisorId }, data: { profileImage: url }, include: { organization: true } })
    return { advisor, previousUrl: previous.profileImage }
  }, { isolationLevel: 'ReadCommitted' }).catch(async (failure) => {
    const current = await prisma.advisor.findUnique({ where: { id: advisorId }, select: { profileImage: true } }).catch(() => undefined)
    if (current !== undefined && current?.profileImage !== url) await remove(path)
    throw failure
  })

  const ownerPrefix = bucket.getPublicUrl(`${advisorId}/`).data.publicUrl
  if (previousUrl?.startsWith(ownerPrefix)) {
    const filename = previousUrl.slice(ownerPrefix.length)
    if (/^[\da-f-]{36}\.(jpg|png|webp)$/.test(filename)) await remove(`${advisorId}/${filename}`)
  }
  return advisor
}
