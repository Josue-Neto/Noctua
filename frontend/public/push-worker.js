self.addEventListener('push', event => {
  let payload = {}
  try { payload = event.data?.json() ?? {} } catch { /* Invalid payload uses a generic notification. */ }
  const path = typeof payload.url === 'string' && /^\/atividades\/[0-9a-f-]{36}$/i.test(payload.url) ? payload.url : '/inicio'
  event.waitUntil(self.registration.showNotification('Noctua', {
    body: typeof payload.body === 'string' ? payload.body : 'Você tem um lembrete na sua agenda.',
    icon: '/noctua-logo.png', data: { path }, tag: `noctua-${path}`,
  }))
})
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const path = event.notification.data?.path ?? '/inicio'
  const url = new URL(path, self.location.origin)
  if (url.origin !== self.location.origin) return
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async clients => {
    const existing = clients.find(client => new URL(client.url).origin === self.location.origin)
    if (existing) { await existing.navigate(url.href); return existing.focus() }
    return self.clients.openWindow(url.href)
  }))
})
