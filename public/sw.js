
const CACHE_NAME = 'vibes-cache-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  // API запросы — пропускаем (Network Only)
  if (event.request.url.includes('/api/')) {
    return;
  }

  // HTML/навигация — Network First (всегда пытаемся взять свежий с сервера)
  // Это решает проблему белого экрана после деплоя
  if (event.request.mode === 'navigate' ||
      event.request.url.endsWith('.html') ||
      event.request.url.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Успешно получили с сервера — обновляем кэш для оффлайна
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Офлайн — отдаём из кэша
          return caches.match(event.request);
        })
    );
    return;
  }

  // Статические ресурсы (JS/CSS с хэшами) — Cache First
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
