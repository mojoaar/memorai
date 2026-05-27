var CACHE = 'memorai-v0.1.9';
var URLS = [
  '/',
  'index.html',
  'css/style.css',
  'js/state.js',
  'js/utils.js',
  'js/icons.js',
  'js/storage.js',
  'js/notes.js',
  'js/sync.js',
  'js/image.js',
  'js/ui.js',
  'js/app.js',
  'favicon.svg',
  'favicon-16.png',
  'favicon-32.png',
  'favicon-192.png',
  'favicon-512.png',
  'og-image.png',
  'manifest.json',
  'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
  'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11/build/highlight.min.js',
  'https://cdn.jsdelivr.net/npm/dompurify@3/dist/purify.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap'
];

var ALLOWED_ORIGINS = [
  self.location.origin,
  'cdn.jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

function isCacheable(url) {
  return ALLOWED_ORIGINS.some(function (origin) {
    return url.startsWith('https://' + origin) || url.startsWith(self.location.origin);
  });
}

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return Promise.all(
        URLS.map(function (url) {
          return cache.add(url).catch(function (err) {
            console.warn('SW: failed to cache', url, err);
          });
        })
      );
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) { return key !== CACHE; }).map(function (key) {
          return caches.delete(key);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      if (cached) return cached;
      return fetch(e.request).then(function (response) {
        if (response && response.status === 200 && isCacheable(e.request.url)) {
          var clone = response.clone();
          caches.open(CACHE).then(function (cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      });
    })
  );
});
