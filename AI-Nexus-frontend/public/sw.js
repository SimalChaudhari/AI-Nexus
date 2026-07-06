/* AI Nexus Web Push service worker */

self.addEventListener('push', (event) => {
  let payload = {
    title: 'AI Nexus',
    body: 'You have a new notification',
    link: '/announcements',
    tag: 'ai-nexus-notification',
  };

  try {
    if (event.data) {
      payload = { ...payload, ...event.data.json() };
    }
  } catch (error) {
    // ignore malformed payload
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'AI Nexus', {
      body: payload.body || '',
      tag: payload.tag || 'ai-nexus-notification',
      renotify: true,
      data: { link: payload.link || '/announcements' },
      icon: '/favicon.ico',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification?.data?.link || '/announcements';
  const targetUrl = new URL(link, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
