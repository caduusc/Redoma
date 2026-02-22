// sw.js — Service Worker Redoma (PWA + Push)

// Mantém seus ícones base64 (use os seus mesmos valores)
const ICON_192 = 'data:image/png;base64,....'; // <-- mantenha o seu
const ICON_512 = 'data:image/png;base64,....'; // <-- mantenha o seu

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// (Opcional) servir ícones se você usa paths /icon-192.png e /icon-512.png
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname === '/icon-192.png') {
    event.respondWith(fetch(ICON_192).catch(() => new Response('', { status: 404 })));
    return;
  }
  if (url.pathname === '/icon-512.png') {
    event.respondWith(fetch(ICON_512).catch(() => new Response('', { status: 404 })));
    return;
  }
});

// ✅ PUSH: funciona com app FECHADO/MINIMIZADO (PWA)
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Nova mensagem', body: 'Você recebeu uma nova mensagem' };
  }

  const title = data.title || 'Nova mensagem';
  const body = data.body || 'Você recebeu uma nova mensagem';
  const url =
    data.url ||
    (self.location.origin + '/#/agent/inbox'); // ajuste se seu app usa outra rota

  const options = {
    body,
    icon: ICON_192,
    badge: ICON_192,
    tag: data.tag || 'redoma-message',
    renotify: true,
    // vibração funciona em Android geralmente; iOS pode ignorar
    vibrate: [200, 100, 200],
    data: { url },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ✅ Se mudar subscription (raro), você pode tratar aqui (opcional)
// self.addEventListener('pushsubscriptionchange', (event) => {
//   // normal: recriar subscription e mandar pro backend (precisa de lógica extra)
// });

// ✅ Recebe mensagem do app para disparar notificação (quando app está aberto)
// (Isso você já tinha — mantive)
self.addEventListener('message', (event) => {
  if (event.data?.type === 'NOTIFY') {
    const { title, body, tag, url } = event.data;
    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: ICON_192,
        badge: ICON_192,
        tag: tag || 'redoma-message',
        renotify: true,
        vibrate: [200, 100, 200],
        data: { url: url || (self.location.origin + '/#/agent/inbox') },
      })
    );
  }
});

// ✅ Clique na notificação (você já tinha — mantive)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl =
    event.notification.data?.url || (self.location.origin + '/#/agent/inbox');

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
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