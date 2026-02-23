// sw.js — Service Worker Redoma (PWA + Push) — CLEAN VERSION

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));


// ✅ PUSH → funciona com app FECHADO / MINIMIZADO (PWA)
self.addEventListener('push', (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {
      title: 'Nova mensagem',
      body: 'Você recebeu uma nova mensagem'
    };
  }

  const title = data.title || 'Nova mensagem';
  const body = data.body || 'Você recebeu uma nova mensagem';

  const targetUrl =
    data.url ||
    (self.location.origin + '/#/agent/inbox');

  const options = {
    body,
    tag: data.tag || 'redoma-message',
    renotify: true,
    // Android geralmente respeita, iOS pode ignorar
    vibrate: [200, 100, 200],
    data: { url: targetUrl }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});


// ✅ NOTIFICAÇÃO DISPARADA PELO APP (quando aberto)
self.addEventListener('message', (event) => {
  if (event.data?.type === 'NOTIFY') {

    const { title, body, tag, url } = event.data;

    const targetUrl =
      url ||
      (self.location.origin + '/#/agent/inbox');

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        tag: tag || 'redoma-message',
        renotify: true,
        vibrate: [200, 100, 200],
        data: { url: targetUrl }
      })
    );
  }
});


// ✅ CLIQUE NA NOTIFICAÇÃO
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl =
    event.notification.data?.url ||
    (self.location.origin + '/#/agent/inbox');

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {

        for (const client of clients) {
          if ('focus' in client) {
            client.focus();
            client.navigate(targetUrl);
            return;
          }
        }

        return self.clients.openWindow(targetUrl);
      })
  );
});