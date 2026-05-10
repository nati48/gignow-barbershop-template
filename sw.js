// Service Worker for Ron Amar PWA - v3 (Offline-capable + Push Notifications)
const CACHE_NAME = 'ronamar-v3';
const OFFLINE_URL = '/offline.html';

// Critical assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/booking.js',
  '/js/dashboard.js',
  '/js/supabase-client.js',
  '/js/firebase-init.js',
  '/js/i18n.js',
  '/images/hero-bg.jpg',
  '/images/ron-profile.jpg',
  '/images/icon-192.png',
  '/images/icon-512.png',
  '/images/logo.jpg',
  '/manifest.json',
];

// ── Install: Pre-cache critical assets ──────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// ── Activate: Clean old caches ──────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: Strategy-based caching ───────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Network-first for API calls and Supabase
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache successful API responses for offline fallback
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Skip external resources (CDNs, analytics, etc.) - let them through
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for static assets (HTML, CSS, JS, images, fonts)
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // Return cached version, but update cache in background
        fetch(event.request).then(networkResponse => {
          if (networkResponse.ok) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      // Not in cache - fetch from network
      return fetch(event.request).then(networkResponse => {
        if (networkResponse.ok) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return networkResponse;
      }).catch(() => {
        // Offline fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
        return new Response('', { status: 503, statusText: 'Offline' });
      });
    })
  );
});

// ── Push Notifications ──────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'המספרה של דני', body: 'יש לך הודעה חדשה', icon: '/images/icon-192.png' };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/images/icon-192.png',
    badge: '/images/favicon-32.png',
    vibrate: [200, 100, 200],
    dir: 'rtl',
    lang: 'he',
    tag: data.tag || 'ronamar-notification',
    renotify: true,
    data: {
      url: data.url || '/',
      appointmentId: data.appointmentId || null
    },
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ── Notification Click ──────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Focus existing window if available
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Open new window
      return clients.openWindow(targetUrl);
    })
  );
});
