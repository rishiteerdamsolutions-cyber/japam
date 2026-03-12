import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

declare let self: ServiceWorkerGlobalScope

// Precaching (manifest injected by vite-plugin-pwa)
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// For registerType: 'prompt' — skip waiting when client sends SKIP_WAITING
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

// Notification click: focus existing app window or open new one
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const origin = self.location.origin
      for (const client of clientList) {
        const url = client.url
        if (url === origin + '/' || url.startsWith(origin + '/')) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/')
      }
    })
  )
})

self.skipWaiting()
clientsClaim()
