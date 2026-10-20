// Siyarwa Pull service worker
// Scope: installability + a basic offline fallback for navigations.
// Deliberately does NOT cache /api/* or Supabase requests — this app's
// data (feed, messages, forges) must always be fresh, not served stale.

const CACHE_VERSION = 'siyarwa-pull-v1'
const APP_SHELL = [
  '/manifest.webmanifest',
  '/pull-icon-192.png',
  '/pull-icon-512.png',
  '/offline',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Never intercept API calls, Supabase auth/data, or non-GET requests.
  if (
    request.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    url.origin !== self.location.origin
  ) {
    return
  }

  // Navigations: try the network first, fall back to the offline page.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline'))
    )
    return
  }

  // Static assets: cache-first, populate cache in the background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, response.clone()))
          }
          return response
        })
        .catch(() => cached)
      return cached || network
    })
  )
})
