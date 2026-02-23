import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

/**
 * iOS: push em background só faz sentido em PWA instalado.
 * - standalone no iOS: navigator.standalone
 * - em geral: display-mode: standalone
 */
function isStandalonePwa(): boolean {
  // @ts-ignore (iOS Safari)
  const iosStandalone = window.navigator.standalone === true;
  const displayModeStandalone =
    window.matchMedia?.('(display-mode: standalone)')?.matches === true;
  return iosStandalone || displayModeStandalone;
}

async function registerPushIfPossible() {
  try {
    if (!('serviceWorker' in navigator)) return;
    if (!('PushManager' in window)) return;

    // Se você quer SÓ no PWA (como você pediu), mantemos esse gate:
    if (!isStandalonePwa()) return;

    // registra o SW na raiz (tem que existir em /sw.js)
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

    // não pede permissão automaticamente se já foi negada
    if (Notification.permission === 'denied') return;

    // pede permissão (idealmente isso é feito após clique; mas aqui já ajuda a destravar)
    // se quiser 100% iOS-friendly, mova isso para um botão "Ativar notificações" no app
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return;

    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;

    if (!vapidPublicKey || !supabaseUrl) {
      console.warn('Faltam env vars: VITE_VAPID_PUBLIC_KEY e/ou VITE_SUPABASE_URL');
      return;
    }

    // evita duplicar subscription
    const existing = await reg.pushManager.getSubscription();
    const sub =
      existing ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      }));

    const res = await fetch(`${supabaseUrl}/functions/v1/register-subscription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.warn('register-subscription falhou:', res.status, txt);
    }
  } catch (err) {
    console.warn('Push setup error:', err);
  }
}

// chama em background (não bloqueia render)
registerPushIfPossible();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);