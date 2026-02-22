/**
 * useAgentNotifications
 *
 * Notificações push reais para atendentes via Service Worker.
 * - Popup nativo no mobile (mesmo com app em segundo plano)
 * - Funciona como app instalado (PWA)
 * - 100% gratuito, sem serviços externos
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export type NotifPermission = 'default' | 'granted' | 'denied' | 'unsupported';

const ENABLED_KEY = 'redoma_notifications_enabled';
const SW_PATH = '/sw.js';

// Som curto via AudioContext
function playSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch {}
}

async function getOrRegisterSW(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration('/');
    if (existing) return existing;
    return await navigator.serviceWorker.register(SW_PATH, { scope: '/' });
  } catch (e) {
    console.warn('[SW] registro falhou', e);
    return null;
  }
}

export function useAgentNotifications() {
  const isSupported =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator;

  const [permission, setPermission] = useState<NotifPermission>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission as NotifPermission;
  });

  const [enabled, setEnabled] = useState(() => {
    return localStorage.getItem(ENABLED_KEY) === 'true';
  });

  const swRegRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!isSupported) return;
    getOrRegisterSW().then((reg) => { swRegRef.current = reg; });
    setPermission(Notification.permission as NotifPermission);
  }, [isSupported]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    const result = await Notification.requestPermission();
    setPermission(result as NotifPermission);
    if (result !== 'granted') return false;

    setEnabled(true);
    localStorage.setItem(ENABLED_KEY, 'true');

    const reg = swRegRef.current ?? (await getOrRegisterSW());
    swRegRef.current = reg;

    if (reg) {
      await reg.showNotification('Alertas ativados — Redoma', {
        body: 'Você receberá alertas quando clientes enviarem mensagens.',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'redoma-setup',
        vibrate: [100, 50, 100],
      } as any);
    } else {
      new Notification('Alertas ativados — Redoma', {
        body: 'Você receberá alertas de novas mensagens.',
      });
    }
    return true;
  }, [isSupported]);

  const disableNotifications = useCallback(() => {
    setEnabled(false);
    localStorage.setItem(ENABLED_KEY, 'false');
  }, []);

  const notify = useCallback(
    ({ title, body }: { title: string; body: string }) => {
      if (!enabled) return;
      if (!isSupported) return;
      if (Notification.permission !== 'granted') return;

      playSound();

      const reg = swRegRef.current;
      if (reg) {
        reg.showNotification(title, {
          body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'redoma-message',
          renotify: true,
          vibrate: [200, 100, 200],
          data: { url: window.location.origin + '/#/agent/inbox' },
        } as any);
      } else {
        if (document.visibilityState === 'visible' && document.hasFocus()) return;
        new Notification(title, { body, icon: '/icon-192.png', tag: 'redoma-message' });
      }
    },
    [enabled, isSupported]
  );

  return { permission, enabled, isSupported, requestPermission, disableNotifications, notify };
}