// sw.js — Service Worker Redoma
const CACHE_NAME = 'redoma-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// Gera ícone PWA via OffscreenCanvas (sem arquivo PNG externo)
function generateIcon(size) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const c = size / 2;

  ctx.beginPath();
  ctx.arc(c, c, c, 0, Math.PI * 2);
  ctx.fillStyle = '#1E2A3A';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(c, c, c * 0.55, 0, Math.PI * 2);
  ctx.strokeStyle = '#6B8BA4';
  ctx.lineWidth = size / 22;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(c, c, c * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = '#A3BCCB';
  ctx.fill();

  [[45, 0.32], [135, 0.28], [225, 0.30], [315, 0.26]].forEach(([angle, r]) => {
    const rad = (angle * Math.PI) / 180;
    const x = c + size * r * Math.cos(rad);
    const y = c + size * r * Math.sin(rad);
    ctx.beginPath();
    ctx.arc(x, y, c * 0.07, 0, Math.PI * 2);
    ctx.fillStyle = '#A3BCCB';
    ctx.fill();
  });

  return canvas.convertToBlob({ type: 'image/png' });
}

// Intercepta requisições de ícone e gera dinamicamente
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname === '/icon-192.png') {
    event.respondWith(
      generateIcon(192).then((blob) => new Response(blob, { headers: { 'Content-Type': 'image/png' } }))
    );
    return;
  }

  if (url.pathname === '/icon-512.png') {
    event.respondWith(
      generateIcon(512).then((blob) => new Response(blob, { headers: { 'Content-Type': 'image/png' } }))
    );
    return;
  }
});

// Recebe mensagem do app para disparar notificação
self.addEventListener('message', (event) => {
  if (event.data?.type === 'NOTIFY') {
    const { title, body, tag } = event.data;
    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: tag || 'redoma-message',
        renotify: true,
        vibrate: [200, 100, 200],
        data: { url: self.location.origin + '/#/agent/inbox' },
      })
    );
  }
});

// Clique na notificação — abre/foca o app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || self.location.origin + '/#/agent/inbox';
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