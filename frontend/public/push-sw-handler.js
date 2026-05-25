/* Web Push handlers — loaded by the PWA service worker via importScripts. */

function parsePushData(event) {
  try {
    if (!event.data) return null;
    const raw = event.data.json();
    if (raw && typeof raw === 'object') return raw;
  } catch {
    try {
      const text = event.data.text();
      if (text) return JSON.parse(text);
    } catch {
      /* ignore */
    }
  }
  return null;
}

self.addEventListener('push', function (event) {
  const data = parsePushData(event);
  const title = (data && data.title) || 'Yangi buyurtma';
  const body = (data && data.body) || '';
  const url = (data && data.url) || '/picker';
  const tag = (data && data.tag) || 'order-alert';

  event.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      tag: tag,
      icon: '/web-app-manifest-192x192.png',
      badge: '/web-app-manifest-192x192.png',
      data: { url: url, orderId: data && data.orderId },
      vibrate: [120, 60, 120],
      requireInteraction: true,
    }),
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/picker';
  const target = new URL(url, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i += 1) {
        const client = clientList[i];
        if (client.url && 'focus' in client) {
          return client.focus().then(function () {
            if ('navigate' in client) return client.navigate(target);
          });
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    }),
  );
});
