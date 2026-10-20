// Retire the old offline worker so it cannot restore removed lessons.
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  const names = await caches.keys();
  await Promise.all(names.filter(name => name.startsWith('hsk5-offline-'))
    .map(name => caches.delete(name)));
  await self.registration.unregister();
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  await Promise.all(windows.filter(client => client.url.startsWith(self.registration.scope))
    .map(client => client.navigate(self.registration.scope)));
})()));
