import { registerRoute } from 'workbox-routing'
import { NetworkOnly } from 'workbox-strategies'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { handleReminderMessage, installReminderListeners } from './sw-reminder'

declare let self: ServiceWorkerGlobalScope

installReminderListeners(self)

/**
 * Installed PWA: OAuth / Firebase return URLs often include query parameters. Serving a
 * precached (possibly stale) index.html for that navigation can break redirect sign-in
 * because the app bundle must be current. Match before precache: network-only.
 */
function looksLikeAuthReturnNavigation(request: Request, url: URL): boolean {
  if (request.mode !== 'navigate' || url.origin !== self.location.origin) return false
  if (!url.search || url.search === '?') return false
  const p = url.searchParams
  if (p.has('code') || p.has('apiKey') || p.has('oobCode')) return true
  if (p.has('state') && (p.has('scope') || p.has('authuser'))) return true
  if (p.has('mode') && (p.get('mode') === 'signIn' || p.get('mode') === 'signin')) {
    return true
  }
  return false
}

registerRoute(
  ({ request, url }) => looksLikeAuthReturnNavigation(request, url),
  new NetworkOnly()
)

// Precaching (manifest injected by vite-plugin-pwa)
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// For registerType: 'prompt' — only skip waiting when user clicks "Update Now"
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
  if (handleReminderMessage(event.data)) return
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
