import type { WebApp as WebAppType } from '@twa-dev/types';

// Читаем window.Telegram.WebApp напрямую, а не через @twa-dev/sdk: этот
// пакет при импорте безусловно создаёт СВОЮ копию window.Telegram.WebApp,
// затирая настоящий мост, который уже внедрил клиент Telegram. Из-за этого
// платформа/версия/CloudStorage переставали быть доступны даже внутри
// настоящего Telegram — приложение говорило с собственной пустой заглушкой
// вместо реального моста. Скрипт telegram-web-app.js в index.html сам
// корректно определяет, есть ли настоящий мост, и создаёт заглушку только
// если его действительно нет (например, при открытии в обычном браузере).
export const tg: WebAppType | null = (() => {
  try {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      return window.Telegram.WebApp;
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

/** Диалог подтверждения через Telegram (если доступен) с откатом на window.confirm. */
export function confirmAction(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (tg && typeof tg.showConfirm === 'function') {
      try {
        tg.showConfirm(message, (confirmed) => resolve(!!confirmed));
        return;
      } catch {
        // откатываемся на window.confirm ниже
      }
    }
    resolve(window.confirm(message));
  });
}
