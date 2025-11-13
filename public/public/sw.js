<<<<<<< Updated upstream
const CACHE_NAME = 'haberokuyoruz-v1';
const STATIC_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API isteklerini her zaman network'ten al
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        // Offline durumunda cache'den eski veriyi göster
        return caches.match('/api/news').then((response) => {
          return response || new Response(JSON.stringify({ items: [], total: 0, sources: [] }), {
            headers: { 'Content-Type': 'application/json' }
          });
        });
      })
    );
    return;
  }

  // Diğer istekler için cache-first stratejisi
  event.respondWith(
    caches.match(request).then((response) => {
      return response || fetch(request).then((fetchResponse) => {
        // Sadece GET isteklerini cache'le
        if (request.method === 'GET' && fetchResponse.ok) {
          const responseClone = fetchResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return fetchResponse;
      });
    })
  );
});

=======
const CACHE_NAME = 'haberokuyoruz-v1';
const STATIC_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API isteklerini her zaman network'ten al
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        // Offline durumunda cache'den eski veriyi göster
        return caches.match('/api/news').then((response) => {
          return response || new Response(JSON.stringify({ items: [], total: 0, sources: [] }), {
            headers: { 'Content-Type': 'application/json' }
          });
        });
      })
    );
    return;
  }

  // Diğer istekler için cache-first stratejisi
  event.respondWith(
    caches.match(request).then((response) => {
      return response || fetch(request).then((fetchResponse) => {
        // Sadece GET isteklerini cache'le
        if (request.method === 'GET' && fetchResponse.ok) {
          const responseClone = fetchResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return fetchResponse;
      });
    })
  );
});

>>>>>>> Stashed changes
