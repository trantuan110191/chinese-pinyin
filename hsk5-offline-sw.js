const CACHE = 'hsk5-offline-v1';
const FILES = ['./', 'index.html', 'hsk5/app.mjs?v=1', 'hsk5/site.css?v=1', 'hsk5/core.mjs', 'hsk5/storage.mjs', 'hsk5/player.mjs', 'hsk5/lesson-adapter.mjs', 'hsk5/vendor/jszip.min.js', 'hsk5/audio/lesson01-part1.vtt', 'hsk5/audio/lesson01-part2.txt'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES))));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin || event.request.headers.has('range')) return;
  event.respondWith(fetch(event.request).catch(async () => (await caches.match(event.request)) || Response.error()));
});
