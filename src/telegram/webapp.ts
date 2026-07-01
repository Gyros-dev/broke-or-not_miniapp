import WebApp from '@twa-dev/sdk';

export const tg: typeof WebApp | null = (() => {
  try {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      return WebApp;
    }
  } catch {
    // не в среде Telegram
  }
  return null;
})();

export function initTelegramApp() {
  if (!tg) return;
  try {
    tg.ready();
    tg.expand();
    tg.disableVerticalSwipes();
  } catch {
    // некоторые методы могут отсутствовать в старых клиентах или вне Telegram
  }
}

export function haptic(
  style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'light',
) {
  tg?.HapticFeedback?.impactOccurred?.(style);
}

export function hapticNotification(type: 'error' | 'success' | 'warning') {
  tg?.HapticFeedback?.notificationOccurred?.(type);
}

export function hapticSelection() {
  tg?.HapticFeedback?.selectionChanged?.();
}
