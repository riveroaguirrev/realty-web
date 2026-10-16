self.addEventListener('push', event => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(self.registration.showNotification(data.title || 'Nuevo requerimiento', {
    body: data.body, tag: data.tag, icon: '/favicon.svg', data: { url: data.url || '/requirements' },
  }))
})
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/requirements', self.location.origin)
  if (target.origin !== self.location.origin) return
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async clients => {
    for (const client of clients) {
      if ('focus' in client) { await client.navigate(target.href); return client.focus() }
    }
    return self.clients.openWindow(target.href)
  }))
})
