const CACHE_NAME = 'cucquy-offline-v2';
const OFFLINE_URL = '/offline.html';
const CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html'
];
self.addEventListener('install', (event) => {
  // Cache các file cần thiết, gồm cả offline page, icon, và các URL khai báo sẵn
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      const urlsToCache = [
        OFFLINE_URL,
        './icon.svg',
        // Các URL trong CACHE_URLS (nếu tồn tại)
        ...CACHE_URLS.map(url => new Request(url, { cache: 'reload' }))
      ];

      return cache.addAll(urlsToCache);
    })
  );

  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Clean up old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Tell the active service worker to take control of the page immediately
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Bỏ qua API calls và external resources
  if (url.pathname.startsWith('/api/') || !url.origin.includes(location.origin)) {
    return;
  }

  // Handle navigation requests (SPA routes)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Nếu offline, thử lấy từ cache
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Nếu không có trong cache, trả về index.html (cho SPA routing)
              return caches.match('/index.html') || caches.match('/') || caches.match(OFFLINE_URL);
            });
        })
    );
    return;
  }

  // Handle other requests (assets, images, etc.)
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request)
          .then((response) => {
            // Cache successful responses
            if (response.ok) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            // Return offline page for navigation requests if fetch fails
            if (request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
          });
      })
  );
});