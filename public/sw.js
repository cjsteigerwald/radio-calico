/**
 * RadioCalico Service Worker
 * Basic service worker for PWA capabilities and offline support
 */

const CACHE_NAME = 'radiocalico-v1.0.7';
const STATIC_CACHE_URLS = [
  '/radio-modular.html',
  '/css/main.css',
  '/css/base/variables.css',
  '/css/base/reset.css',
  '/css/base/layout.css',
  '/css/components/header.css',
  '/css/components/album-artwork.css',
  '/css/components/track-details.css',
  '/css/components/rating-system.css',
  '/css/components/player-controls.css',
  '/css/components/recent-tracks.css',
  '/css/utilities/helpers.css',
  '/js/app.js',
  '/js/utils/AppState.js',
  '/js/services/ApiService.js',
  '/js/services/iTunesService.js',
  '/js/services/MetadataService.js',
  '/js/modules/AudioPlayer.js',
  '/js/modules/RatingSystem.js',
  '/RadioCalicoLogoTM.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets...');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle requests from same origin
  if (url.origin !== location.origin) {
    return;
  }

  // For API requests, use network first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only cache GET requests that are successful
          if (request.method === 'GET' && response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache for offline support (only for GET requests)
          if (request.method === 'GET') {
            return caches.match(request);
          }
          // For non-GET requests, throw the error
          throw new Error('Network request failed');
        })
    );
    return;
  }

  // For static assets, use cache first with network fallback
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version
          return cachedResponse;
        }

        // Fetch from network
        return fetch(request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response.ok) {
              return response;
            }

            // Cache successful responses
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseClone);
              });

            return response;
          });
      })
      .catch(() => {
        // If it's an HTML request and offline, serve cached HTML
        if (request.headers.get('accept').includes('text/html')) {
          return caches.match('/radio-modular.html');
        }
      })
  );
});

// Background sync for rating submissions (future enhancement)
self.addEventListener('sync', (event) => {
  if (event.tag === 'rating-sync') {
    event.waitUntil(syncRatings());
  }
});

// Push notifications (future enhancement)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New track playing on RadioCalico',
    icon: '/RadioCalicoLogoTM.png',
    badge: '/RadioCalicoLogoTM.png',
    tag: 'track-notification',
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification('RadioCalico', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll()
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes('radio-modular.html') && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/radio-modular.html');
        }
      })
  );
});

/**
 * Sync pending ratings (placeholder for future implementation)
 */
async function syncRatings() {
  try {
    // This would sync any pending ratings stored in IndexedDB
    console.log('Syncing ratings...');
    // Implementation would go here
  } catch (error) {
    console.error('Failed to sync ratings:', error);
  }
}

console.log('RadioCalico Service Worker loaded');