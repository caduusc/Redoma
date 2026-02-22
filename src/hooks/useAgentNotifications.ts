/**
 * useAgentNotifications
 *
 * Gerencia Web Push Notifications nativas do navegador para atendentes.
 * - 100% gratuito, sem serviços externos
 * - Funciona em desktop e mobile (PWA)
 * - O atendente precisa conceder permissão uma única vez
 */

import { useCallback, useEffect, useState } from 'react';

export type NotificationPermission = 'default' | 'granted' | 'denied';

const NOTIFICATION_ENABLED_KEY = 'redoma_notifications_enabled';

// Som de notificação via AudioContext (sem arquivo externo)
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  } catch {
    // silently ignore — AudioContext pode não estar disponível
  }
}

export function useAgentNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof Notification === 'undefined') return 'denied';
    return Notification.permission as NotificationPermission;
  });

  const [enabled, setEnabled] = useState(() => {
    return localStorage.getItem(NOTIFICATION_ENABLED_KEY) === 'true';
  });

  // Sincroniza estado com permissão real do browser
  useEffect(() => {
    if (typeof Notification === 'undefined') return;
    setPermission(Notification.permission as NotificationPermission);
  }, []);

  /**
   * Solicita permissão ao usuário (deve ser chamado por interação do usuário)
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof Notification === 'undefined') return false;

    const result = await Notification.requestPermission();
    setPermission(result as NotificationPermission);

    if (result === 'granted') {
      setEnabled(true);
      localStorage.setItem(NOTIFICATION_ENABLED_KEY, 'true');
      // Mostra uma notificação de teste
      new Notification('✅ Notificações ativadas!', {
        body: 'Você receberá alertas quando clientes enviarem mensagens.',
        icon: '/favicon.ico',
        tag: 'redoma-test',
      });
      return true;
    }

    return false;
  }, []);

  /**
   * Desativa notificações (sem revogar permissão do browser)
   */
  const disableNotifications = useCallback(() => {
    setEnabled(false);
    localStorage.setItem(NOTIFICATION_ENABLED_KEY, 'false');
  }, []);

  /**
   * Dispara uma notificação para o atendente
   */
  const notify = useCallback(
    ({
      title,
      body,
      onClick,
    }: {
      title: string;
      body: string;
      onClick?: () => void;
    }) => {
      if (!enabled) return;
      if (typeof Notification === 'undefined') return;
      if (Notification.permission !== 'granted') return;

      // Não notifica se a aba está visível e em foco
      if (document.visibilityState === 'visible' && document.hasFocus()) {
        // Apenas toca o som quando o app está em foco
        playNotificationSound();
        return;
      }

      playNotificationSound();

      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'redoma-message',
        renotify: true,
      });

      if (onClick) {
        notification.onclick = () => {
          window.focus();
          notification.close();
          onClick();
        };
      }
    },
    [enabled]
  );

  return {
    permission,
    enabled,
    requestPermission,
    disableNotifications,
    notify,
    isSupported: typeof Notification !== 'undefined',
  };
}