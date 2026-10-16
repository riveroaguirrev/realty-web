import webpush from 'web-push'
import { prisma } from '@/lib/prisma'
export const pushConfigured = () => Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT)
export async function deliverPendingPush(requirementId?: string) {
  if (!pushConfigured()) return { sent: 0, configured: false }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!)
  const pending = await prisma.notification.findMany({
    where: { channel: 'PUSH', type: 'REQUIREMENT_CREATED', scheduledFor: { lte: new Date() }, sendAttempts: { lt: 3 }, ...(requirementId ? { relatedEntityId: requirementId } : {}) },
    orderBy: { createdAt: 'asc' }, take: 100,
  })
  let sent = 0
  // Bound concurrency and provider timeouts; a retry uses the notification id as its browser tag.
  for (let start = 0; start < pending.length; start += 10) {
    await Promise.all(pending.slice(start, start + 10).map(async notification => {
      const leaseUntil = new Date(Date.now() + 120000)
      const claimed = await prisma.notification.updateMany({ where: { id: notification.id, scheduledFor: { lte: new Date() }, sendAttempts: notification.sendAttempts }, data: { scheduledFor: leaseUntil, sendAttempts: { increment: 1 }, lastAttemptAt: new Date() } })
      if (!claimed.count) return
      const subscriptions = await prisma.pushSubscription.findMany({ where: { advisorId: notification.advisorId, advisor: { status: 'ACTIVE' } } })
      let retry = false
      await Promise.all(subscriptions.map(async subscription => {
        try {
          await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ title: notification.title, body: notification.message, url: notification.actionUrl, tag: notification.id }), { TTL: 86400, timeout: 4000 })
          sent++
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode
          if (status === 404 || status === 410) await prisma.pushSubscription.deleteMany({ where: { id: subscription.id } })
          else retry = true
        }
      }))
      await prisma.notification.update({ where: { id: notification.id }, data: { scheduledFor: retry ? new Date(Date.now() + 60000 * (notification.sendAttempts + 1)) : null, failureReason: retry ? 'Entrega push pendiente; se reintentará.' : null } })
    }))
  }
  return { sent, configured: true }
}
